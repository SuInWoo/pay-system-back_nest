## 1. 결제 모듈 개요

### 역할

- 주문 단위 결제 생성/준비/승인과 결제 상태 조회를 담당

### 주요 책임

- 멱등 키 기반 결제 생성 (`POST /payments`)
- 토스 결제 준비/승인 (`POST /payments/prepare`, `POST /payments/confirm`)
- 주문 기준 결제 상태 조회 및 관리자 목록 조회
- 결제 생성 이벤트 발행(`payment.created`)으로 주문 모듈과 연동

### 주요 연관 도메인

- 주문(OMS), 유저, 정산(향후)

---

## 2. 아키텍처 · 설계

### 모듈 구조

- `PaymentModule`, `PaymentController`, `PaymentService`, `PaymentRepository`

### 핵심 엔티티/테이블

- `payments`
- 주요 컬럼: `id`, `order_id`, `amount`, `idempotency_key`, `payment_key`, `status`, `provider_status`, `approved_at`
- 인덱스: `uq_payments_idempotency_key`(유니크), `ix_payments_order_id`

### 상태 플로우

- 내부 상태: `PENDING | SUCCEEDED | FAILED`
- `POST /payments`는 학습용 단순 플로우로 즉시 `SUCCEEDED` 저장
- `POST /payments/confirm`은 토스 응답 `DONE`이면 `SUCCEEDED`, 그 외 `PENDING`

### 중요 설계 결정

- 멱등성은 `idempotency_key` 유니크 + 트랜잭션 + unique_violation(23505) 핸들링으로 보장
- 토스 승인 시 `TOSS_SECRET_KEY` 및 `TossPayments-Api-Version` 헤더를 사용
- 외부 PG 오류는 `PAYMENT_PROVIDER_FAILED`로 표준화

---

## 3. API 설계

### 주요 API 목록

- `GET /payments?order_id=` : 결제 목록 조회(관리자)
- `POST /payments` : 결제 생성(멱등 키 필수)
- `POST /payments/prepare` : 토스 결제 준비
- `POST /payments/confirm` : 토스 결제 승인
- `GET /payments/:orderId` : 주문별 결제 상태 조회
- `POST /payments/webhook/toss` : 토스 웹훅 수신(초안)

### 요청/응답에서 중요하게 본 포인트

- 멱등 충돌: `PAYMENT_IDEMPOTENCY_CONFLICT`
- 금액 검증: 주문 금액과 다르면 `PAYMENT_AMOUNT_MISMATCH`
- 중복 승인 방지: `PAYMENT_ALREADY_CONFIRMED`
- PG 실패: `PAYMENT_PROVIDER_FAILED`

---

## 4. 테스트 전략 (결제 모듈)

### 단위 테스트

- 서비스 레이어 비즈니스 로직
- 상태 전이 로직

### 통합 테스트

- `test/e2e/payment.idempotency.int.spec.ts`: 같은 멱등 키로 두 번 요청 시 동일 결제 반환 검증
- `test/unit/modules/payment/payment.service.spec.ts`: 서비스 단위 로직 검증

### 부하·안정성 테스트

- `k6/pay-system.smoke.js`에서 `POST /payments` 포함 E2E 스모크 수행

---

## 5. 리스크 · TODO

### 리스크

- 현재 `confirmWithToss`는 서킷브레이커/재시도 정책이 없어 PG 장애 시 취약
- 웹훅은 서명 검증/이벤트 분기가 미구현 상태라 운영 적용 전 보강 필요

### 앞으로 개선하고 싶은 점

- 부분 취소/부분 환불 API
- 결제 상태 변경 이력 테이블
- 웹훅 기반 비동기 상태 동기화 및 정산 도메인 연결

---

## 6. 개인 회고 · 느낀 점

### 이번 챕터에서 느낀 점

- 결제 모듈 하나만 보더라도 주문/유저/정산과 강하게 연결되어 있어, “어디까지를 결제 책임으로 둘지”를 명확히 하지 않으면 금방 복잡해진다는 걸 느꼈다.

### 배운 것

- 상태 전이와 실패 시나리오를 먼저 문서로 써두고 코드로 옮기면, 테스트 코드와 k6 시나리오 설계가 자연스럽게 따라온다는 점.

### 다음 챕터(주문 모듈)에서 더 신경 쓸 것

- 주문과 결제의 경계를 더 명확히 잡고, “결제 실패/취소가 주문에 어떻게 반영되는지”를 문서·테스트·로그 기준으로 정리해 두기.

