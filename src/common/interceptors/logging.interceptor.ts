import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { maskSensitive } from '../utils/log-mask.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { headers?: any; body?: any }>();
    const res = http.getResponse<any>();

    const requestId =
      (req as any)?.headers?.['x-request-id'] ??
      (req as any)?.headers?.['X-Request-Id'] ??
      randomUUID();

    const method = (req as any)?.method;
    const url = (req as any)?.url;
    const startedAt = Date.now();

    this.logger.log(
      JSON.stringify({
        requestId,
        phase: 'request',
        method,
        url,
        body: maskSensitive((req as any)?.body),
      }),
    );

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Date.now() - startedAt;
        this.logger.log(
          JSON.stringify({
            requestId,
            phase: 'response',
            method,
            url,
            statusCode: (res as any)?.statusCode,
            elapsedMs,
          }),
        );
      }),
      catchError((err) => {
        const elapsedMs = Date.now() - startedAt;
        this.logger.error(
          JSON.stringify({
            requestId,
            phase: 'error',
            method,
            url,
            statusCode: (res as any)?.statusCode,
            elapsedMs,
            errorName: err?.name,
            errorMessage: err?.message,
            errorCode: (err as any)?.code,
          }),
        );
        return throwError(() => err);
      }),
    );
  }
}

