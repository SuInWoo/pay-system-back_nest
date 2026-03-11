# 회의록: 공통코드 및 주문서 확장

- **일자**: 2025-03-11
- **참석 팀**: SQL 담당자(DB), 개발팀

---

## 1. 회의 목적

주문·결제 도메인에서 **공통코드 적용 범위**(배송상태, 결제상태, 사용자상태 등)와 **주문서(orders) 확장**(총 수량·총 금액·주문자) 방안을 합의하기 위함.

---

## 2. 팀별 의견

### SQL 담당자(DB) 의견

- 배송상태·결제상태는 코드 테이블로 분리하고 FK로 참조하는 것이 스키마 정합성·확장성에 유리함.
- 공통코드 테이블은 `(code PK, name, sort_order)` 형태로 두고, 화면 노출·정렬에 활용할 수 있게 함.
- 주문 헤더에 `total_quantity`, `total_amount`를 두어 상세 합계를 중복 계산하지 않도록 하고, 상세 추가·삭제 시 재계산해 갱신하는 방안 제안.
- 주문자 정보는 회원(users FK) + 비회원/수령인용 `orderer_name`, `orderer_phone`, `orderer_email` 컬럼 추가 제안.
- 사용자상태(users.status)는 코드 종류가 적고 변경 빈도가 낮아 당장은 공통코드화하지 않고, 도메인 확장 시 검토 제안.

### 개발팀 의견

- 앱에서는 기존 enum(WAITING, SUCCEEDED 등)을 그대로 사용하고, DB에서만 FK로 코드 존재 여부를 검증하는 방식으로 구현 부담을 줄이자고 함.
- 주문 생성 시 `total_quantity`, `total_amount`는 0으로 초기화하고, 상세 추가/삭제 시 한 번에 재계산해 갱신하는 로직으로 합의 가능하다고 함.
- 배송·결제 상태는 공통코드 테이블 + FK 적용에 동의. 사용자상태는 추후 필요 시 추가하기로 함.

---

## 3. 결론

- **공통코드 적용**
  - **배송상태**: `delivery_status_code` 테이블 생성 (code PK, name, sort_order) + 시드. `orders.delivery_status` → FK.
  - **결제상태**: `payment_status_code` 테이블 생성 + 시드. `payments.status` → FK.
  - **사용자상태**: 당장은 공통코드 미적용. 도메인 확장 시 `user_status_code` 추가 검토.
- **애플리케이션**: 기존 enum 값 그대로 사용. DB에서만 해당 코드 존재 여부 FK로 검증.
- **주문서(orders) 확장**
  - 컬럼 추가: `total_quantity`, `total_amount` (기본 0), `orderer_user_id`(users FK, nullable), `orderer_name`, `orderer_phone`, `orderer_email`.
  - 상세 라인 추가·삭제 시 주문 헤더의 `total_quantity`, `total_amount` 재계산·갱신.

---

## 4. 비고

- 스키마·API 반영 내용은 `docs/schema.sql`, `docs/erd.md` 참고.

