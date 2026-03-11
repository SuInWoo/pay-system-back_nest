import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../errors/app.exception';

/** 모든 HTTP 예외를 동일한 형태(statusCode, code, message[, errors])로 내려주기 위한 전역 필터. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    // 1) 우리가 정의한 AppException: code + message 계약 그대로 전달
    if (exception instanceof AppException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown>;
      this.logger.warn(
        `AppException: code=${body.code} status=${status} message=${body.message}`,
      );
      res.status(status).json({
        statusCode: status,
        code: body.code,
        message: body.message,
        ...(body.detail !== undefined && { detail: body.detail }),
      });
      return;
    }

    // 2) Nest 기본 HttpException(ValidationPipe 등): code=VALIDATION_FAILED, message 배열은 errors로
    if (exception && typeof (exception as any).getStatus === 'function') {
      const ex = exception as { getStatus: () => number; getResponse: () => any };
      const status = ex.getStatus();
      const response = ex.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : response?.message ?? '요청을 처리할 수 없습니다.';
      const isValidation =
        status === HttpStatus.BAD_REQUEST && Array.isArray(message);

      res.status(status).json({
        statusCode: status,
        code: isValidation ? 'VALIDATION_FAILED' : 'BAD_REQUEST',
        message: isValidation
          ? '입력값이 올바르지 않습니다.'
          : (Array.isArray(message) ? message[0] : message),
        ...(Array.isArray(message) && message.length > 0 && { errors: message }),
      });
      return;
    }

    // 3) 미분류 오류: 500 + INTERNAL_ERROR (클라이언트에 상세 노출하지 않음)
    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
}
