## 1. 주문(OMS) 모듈 개요

### 역할

- 주문 생성/조회/수정과 주문 상세 라인 관리를 담당

### 주요 책임

- 고객사 기준 주문 분할 생성 (`order_group_id`, `orders[]`)
- 권한/스코프 기반 주문 목록 조회 (`my`, `company`, `all`)
- 주문 상세 라인 추가 및 합계 재계산
- 결제 상태를 기반으로 주문 목록 `status(PAID|PENDING)` 계산

### 주요 연관 도메인

- 결제, 유저, 마스터(고객사/상품)

---

## 2. 아키텍처 · 설계

### 모듈 구조

- `OmsModule`, `OmsController`, `OmsService`, `OrderRepository`, `OrderDetailRepository`

### 핵심 엔티티/테이블

- `orders`, `order_detail`

### 주문 상태 플로우

- `orders.delivery_status`: `WAITING | SHIPPING | DELIVERED`
- 목록 응답 `status`: `payments` 테이블을 조회해 `PAID | PENDING`으로 계산

### 중요 설계 결정

- 주문 생성 시 `items[]`를 `client_company_id`로 그룹핑해 회사별 주문 분할 생성
- 결제 생성 이벤트(`payment.created`)를 수신해 없는 주문이면 최소 주문 레코드를 자동 생성
- 개인정보(PII) 암호화: 주문자명, 주소, 연락처, 이메일은 AES-256-GCM으로 DB 저장 시 암호화. `PII_ENCRYPTION_KEY` 환경변수(32바이트 base64) 필수.

---

## 3. API 설계

### 주요 API 목록

- `GET /orders` : 주문 목록 조회(인증 필요, scope/page/limit/order_id/keyword)
- `POST /orders` : 주문 생성(고객사별 분할)
- `GET /orders/:orderId` : 주문 + 상세 조회
- `POST /orders/:orderId/details` : 주문 상세 라인 추가(인증 필요)
- `PATCH /orders/:orderId` : 주문 수정(주소/주문자/배송상태)

### 주문–결제 연동 포인트

- 결제 모듈 이벤트(`payment.created`) 수신 훅 구현
- 주문 목록의 결제 상태는 `payments.status=SUCCEEDED` 여부로 계산

---

## 4. 테스트 전략 (주문 모듈)

### 단위 테스트

- 서비스 단위 로직(합계 계산, 스코프 검증, 키워드 검색)

### 통합 테스트

- `k6/pay-system.smoke.js`: 결제 생성 -> 주문 조회 -> 상세 추가 흐름 스모크
- E2E는 현재 Auth/Master/Payment 중심으로 구성되어 있어 OMS 전용 E2E 보강 필요

---

## 5. 리스크 · TODO

### 리스크

- `groupItemsByCompany`가 아이템별 상품 조회를 순차 수행해 대량 요청에서 지연 가능
- 결제 상태는 조회 시 계산 방식이라, 고트래픽에서 조인/서브쿼리 부담 증가 가능

### 앞으로 개선하고 싶은 점

- OMS 전용 E2E 테스트 추가
- 분할 주문/결제 묶음 단위 API(결제 일괄 처리 포함) 확장
- 키워드 검색 DB 오프로딩(현재 메모리 필터링 구간 개선)

---

## 6. 개인 회고 · 느낀 점

### 이번 챕터에서 느낀 점

- 주문과 결제를 어디까지 분리할지에 따라, 이후 정산·배송·재고 등 다른 도메인의 설계 자유도가 크게 달라진다는 걸 다시 느꼈다.

### 배운 것

- 주문 상태 플로우를 글과 다이어그램으로 먼저 정리하고 나니, 테스트 케이스와 API 설계가 훨씬 자연스럽게 따라온다는 점.

### 다음 챕터(유저 모듈)에서 더 신경 쓸 것

- 유저 정보와 주문/결제 히스토리 사이의 경계, 그리고 개인정보 보호(로그·백업)를 더 구체적으로 정의해 두기.

