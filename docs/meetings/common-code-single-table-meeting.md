# 회의록: 공통코드 단일 테이블 vs 복수 테이블

- **일자**: 2025-03-11
- **참석 팀**: SQL 담당자(DB), 개발팀

---

## 1. 회의 목적

공통코드를 **단일 테이블(common_code)** 로 관리할지, **코드 종류별 복수 테이블**로 유지할지, 그리고 **client_companies를 common_code에 통합**할 수 있는지 확장성·운영 관점에서 비교하여 방향을 정하기 위함.

---

## 2. 팀별 의견

### SQL 담당자(DB) 의견

- **단일 common_code 테이블 제안**
  - 하나의 테이블에 `code_type`(또는 `code_group`) 컬럼으로 구분: 예) `DELIVERY_STATUS`, `PAYMENT_STATUS`, `USER_STATUS` 등.
  - PK는 `(code_type, code)` 복합키. 컬럼: `code_type`, `code`, `name`, `sort_order`.
  - **확장성**: 새 코드 종류 추가 시 DDL 없이 시드/INSERT만으로 처리 가능. 테이블 수가 늘지 않음.
  - **운영**: 코드 조회·관리 화면을 한 곳에서 공통화하기 쉬움.
- **참조 측 (orders, payments)**
  - FK를 위해 `code_type` + `code`를 함께 저장. 예: orders는 `delivery_code_type`(기본값 `DELIVERY_STATUS`), `delivery_status`(code 값)로 복합 FK.
  - 동일 패턴으로 payments는 `payment_code_type`, `status`로 common_code 참조.
- **client_companies 통합 검토**
  - client_companies는 `id(UUID)`, `code`, `name` 외에 `is_active`, `created_at`, `updated_at` 등 **엔티티 성격**이 강함. 공통코드는 “코드+이름+정렬” 수준이라 스키마 형태가 다름.
  - 공통코드에 통합하면 컬럼이 비대해지거나, 타임스탬프·활성 여부를 포기해야 해서 **통합은 비권장**. 고객사는 별도 테이블 유지 제안.

### 개발팀 의견

- **복수 테이블(delivery_status_code, payment_status_code) 장점**
  - 테이블별 FK로 **타입 안전성**이 명확함. 잘못된 코드 타입 참조 가능성 없음.
  - 스키마 가독성 좋고, 코드/엔티티별로 필요한 컬럼을 다르게 가져가기 쉬움.
- **단일 common_code 테이블 시**
  - 확장 시 DDL 없이 코드 타입만 추가하면 되어 **배포·변경 부담이 적음**.
  - 앱에서는 기존처럼 enum + 코드 값만 사용하고, 참조 테이블에는 `code_type` + `code` 두 컬럼 추가만 수용 가능.
  - client_companies는 엔티티 성격이 달라 **common_code와 합치지 않는 것에 동의**. 별도 테이블 유지.
- **결론 쪽**
  - 확장성·운영 일원화를 우선하면 **단일 common_code 테이블** 선택 가능. FK는 복합키로 처리하고, 앱에서 code_type은 기본값으로 채워 넣는 방식으로 합의 가능.

---

## 3. 결론

- **단일 common_code 테이블 채택**
  - 테이블: `common_code(code_type VARCHAR, code VARCHAR, name VARCHAR, sort_order INT)`, PK `(code_type, code)`.
  - 코드 타입 예: `DELIVERY_STATUS`, `PAYMENT_STATUS`. 향후 `USER_STATUS` 등 추가 시 동일 테이블에 시드만 추가.
- **참조 방식**
  - **orders**: `delivery_code_type`(기본값 `DELIVERY_STATUS`), `delivery_status`(code) → common_code `(code_type, code)` 복합 FK.
  - **payments**: `payment_code_type`(기본값 `PAYMENT_STATUS`), `status`(code) → common_code 복합 FK.
- **client_companies**
  - common_code와 **통합하지 않음**. 기존처럼 별도 테이블 유지. (엔티티 성격·컬럼 구조·생명주기 상 공통코드와 성격이 다름.)
- **애플리케이션**
  - 기존 enum 값(WAITING, SUCCEEDED 등) 유지. DB에만 `code_type` + `code` 컬럼 추가하여 FK 만족. 앱에서 code_type은 기본값으로 설정.

---

## 4. 비고

- 기존 `delivery_status_code`, `payment_status_code` 테이블은 제거하고 `common_code` 한 테이블로 통합.
- 스키마·ERD 반영: `docs/schema.sql`, `docs/erd.md`.
