import { HttpStatus } from '@nestjs/common';

/**
 * API 계약용 공통 에러 코드 및 기본 메시지·HTTP 상태 매핑.
 * 클라이언트는 code로 분기하고, message는 사용자 노출/로그용으로 사용합니다.
 */
export const ERROR_CODES = {
  // --- 인증/권한 (4xx) ---
  /** 자격증명 불일치(로그인 실패) */
  AUTH_INVALID_CREDENTIALS: {
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    statusCode: HttpStatus.UNAUTHORIZED,
  },
  /** 토큰 없음/만료/무효 */
  AUTH_UNAUTHORIZED: {
    message: '인증이 필요합니다.',
    statusCode: HttpStatus.UNAUTHORIZED,
  },
  /** refresh 토큰 불일치 또는 로그아웃으로 서버에 세션 없음 */
  AUTH_SESSION_EXPIRED: {
    message: '세션이 만료되었습니다.',
    statusCode: HttpStatus.UNAUTHORIZED,
  },
  /** 권한 부족 */
  AUTH_FORBIDDEN: {
    message: '접근 권한이 없습니다.',
    statusCode: HttpStatus.FORBIDDEN,
  },
  /** 인증 필요(클라이언트 계약용 단순 코드) */
  UNAUTHORIZED: {
    message: '인증이 필요합니다.',
    statusCode: HttpStatus.UNAUTHORIZED,
  },
  /** scope 권한 불일치 */
  FORBIDDEN_SCOPE: {
    message: '요청한 scope에 대한 권한이 없습니다.',
    statusCode: HttpStatus.FORBIDDEN,
  },

  // --- 회원 (4xx) ---
  /** 역할 미존재 */
  ROLE_NOT_FOUND: {
    message: '역할을 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 사용자 미존재 */
  USER_NOT_FOUND: {
    message: '사용자를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 이메일 중복(회원가입) */
  USER_EMAIL_CONFLICT: {
    message: '이미 사용 중인 이메일입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 사용자 배송지 미존재 */
  USER_ADDRESS_NOT_FOUND: {
    message: '배송지를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },

  // --- 마스터: 고객사/상품 (4xx) ---
  /** 고객사 code/name 중복 */
  MASTER_CLIENT_CONFLICT: {
    message: '이미 존재하는 고객사(code 또는 name)입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 고객사 미존재 */
  MASTER_CLIENT_NOT_FOUND: {
    message: '고객사를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 상품 sku 중복 */
  MASTER_PRODUCT_SKU_CONFLICT: {
    message: '이미 존재하는 상품 sku 입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 메뉴 미존재 */
  MENU_NOT_FOUND: {
    message: '메뉴를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 메뉴 code 중복 */
  MENU_CODE_CONFLICT: {
    message: '이미 존재하는 메뉴 코드입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 상품 미존재 (고객사+sku) */
  PRODUCT_NOT_FOUND: {
    message: '상품을 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },

  // --- OMS: 주문 (4xx) ---
  /** 주문 미존재 */
  ORDER_NOT_FOUND: {
    message: '주문을 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 주문 ID 중복(이미 존재) */
  ORDER_ALREADY_EXISTS: {
    message: '이미 존재하는 주문 ID입니다.',
    statusCode: HttpStatus.CONFLICT,
  },

  // --- 결제/PG 연동 (4xx, 5xx) ---
  /** 결제 금액 불일치 */
  PAYMENT_AMOUNT_MISMATCH: {
    message: '주문 금액과 결제 요청 금액이 일치하지 않습니다.',
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  /** 멱등 키 충돌(다른 주문/금액으로 재사용) */
  PAYMENT_IDEMPOTENCY_CONFLICT: {
    message: '이미 사용된 멱등 키입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 이미 승인된 주문 결제 */
  PAYMENT_ALREADY_CONFIRMED: {
    message: '이미 승인된 결제입니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 결제 건 미존재 */
  PAYMENT_NOT_FOUND: {
    message: '결제 정보를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },
  /** 환불 불가 상태 */
  PAYMENT_NOT_REFUNDABLE: {
    message: '현재 상태에서는 환불할 수 없습니다.',
    statusCode: HttpStatus.CONFLICT,
  },
  /** 외부 PG 연동 실패 */
  PAYMENT_PROVIDER_FAILED: {
    message: '결제사 연동에 실패했습니다.',
    statusCode: HttpStatus.BAD_GATEWAY,
  },
  /** 환불 금액 초과 */
  OMS_REFUND_AMOUNT_EXCEEDED: {
    message: '환불 가능 금액을 초과했습니다.',
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  /** 출고 품목 SKU 불일치 */
  OMS_SHIPMENT_INVALID_SKU: {
    message: '주문에 없는 SKU가 포함되어 있습니다.',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  /** 출고 수량 초과 */
  OMS_SHIPMENT_QUANTITY_EXCEEDED: {
    message: '출고 가능한 수량을 초과했습니다.',
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  /** 출고 정보 미존재 */
  OMS_SHIPMENT_NOT_FOUND: {
    message: '출고 정보를 찾을 수 없습니다.',
    statusCode: HttpStatus.NOT_FOUND,
  },

  // --- 검증 (4xx) ---
  /** DTO/요청 바디 검증 실패 */
  VALIDATION_FAILED: {
    message: '입력값이 올바르지 않습니다.',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  /** 쿼리 파라미터 검증 실패 */
  INVALID_QUERY: {
    message: '쿼리 파라미터가 올바르지 않습니다.',
    statusCode: HttpStatus.BAD_REQUEST,
  },

  // --- 서버 (5xx) ---
  /** 예상치 못한 오류(미분류 시 사용) */
  INTERNAL_ERROR: {
    message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
