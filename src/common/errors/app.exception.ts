import { HttpException } from '@nestjs/common';
import { ERROR_CODES, type ErrorCode } from './error-codes';

/** 클라이언트 계약용 에러 코드를 포함한 공통 예외. 전역 필터에서 code + message로 응답을 만듭니다. */
export class AppException extends HttpException {
  public readonly code: ErrorCode;

  constructor(
    code: ErrorCode,
    options?: {
      /** 기본 메시지 대신 사용할 메시지(드물게 사용) */
      messageOverride?: string;
      /** 추가 정보(필터에서 response.detail로 내려줄 수 있음) */
      detail?: unknown;
    },
  ) {
    const spec = ERROR_CODES[code];
    const message = options?.messageOverride ?? spec.message;
    super(
      {
        code,
        message,
        ...(options?.detail !== undefined && { detail: options.detail }),
      },
      spec.statusCode,
    );
    this.code = code;
  }
}
