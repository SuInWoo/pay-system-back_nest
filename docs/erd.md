# Pay System ERD

SQL 담당자 설계 반영: 단일 common_code(code_type+code), 주문 총수량·총금액·주문자, 상품 복합 PK, 주문 상세, 채번.

## Mermaid ERD

```mermaid
erDiagram
  common_code {
    varchar code_type PK
    varchar code PK
    varchar name
    int sort_order
  }

  users {
    uuid id PK
    varchar email UK
    varchar password_hash
    varchar status
    varchar refresh_token_hash
    timestamptz created_at
    timestamptz updated_at
  }

  client_companies {
    uuid id PK
    varchar code UK
    varchar name UK
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }

  products {
    uuid client_company_id PK_FK
    varchar sku PK
    varchar name
    int price
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }

  orders {
    varchar order_id PK
    varchar delivery_code_type FK
    varchar delivery_status FK
    text address
    int total_quantity
    int total_amount
    uuid orderer_user_id FK
    varchar orderer_name
    varchar orderer_phone
    varchar orderer_email
  }

  order_detail {
    varchar order_id PK_FK
    int line_seq PK
    uuid client_company_id
    varchar sku
    varchar product_name
    int quantity
    int unit_price
  }

  payments {
    uuid id PK
    int amount
    varchar payment_code_type FK
    varchar status FK
    varchar idempotency_key UK
    varchar order_id
  }

  common_code ||--o{ orders : "delivery_code_type, delivery_status"
  common_code ||--o{ payments : "payment_code_type, status"
  users ||--o{ orders : "orderer_user_id"
  client_companies ||--o{ products : "1:N (복합 PK)"
  orders ||--o{ order_detail : "1:N (주문 상세)"
  payments }o--|| orders : "order_id (논리 참조, 서버 채번)"
```

## 관계 요약

| 관계 | 설명 |
|------|------|
| **client_companies → products** | 1:N. 복합 PK `(client_company_id, sku)`. 고객사별 상품코드 유일. |
| **orders → order_detail** | 1:N. 주문 1건당 상세 라인 N개. PK `(order_id, line_seq)`. 상품은 논리 참조(client_company_id, sku)+스냅샷(product_name, unit_price). |
| **common_code → orders** | 배송상태. orders (delivery_code_type, delivery_status) 복합 FK. |
| **common_code → payments** | 결제상태. payments (payment_code_type, status) 복합 FK. |
| **users → orders** | 주문자(회원). orders.orderer_user_id FK, nullable. |
| **payments → orders** | 논리적 1:1. `payments.order_id` = `orders.order_id`. 주문번호는 서버 채번 권장. |
| **users** | 단독 테이블. 인증/세션용. (사용자상태는 향후 공통코드화 가능) |

## 테이블 생성 순서 (FK 기준)

1. `users`
2. `common_code` (code_type, code 복합 PK, 시드)
3. `client_companies`
4. `products` (→ client_companies, 복합 PK)
5. `order_seq` (시퀀스)
6. `orders` (→ common_code 복합 FK, users)
7. `order_detail` (→ orders)
8. `payments` (→ common_code 복합 FK, order_id는 orders FK 미적용)

## PK/식별자 정책

| 테이블 | PK | 비고 |
|--------|-----|------|
| users | id (UUID) | 인증용, 분산 시 유리 |
| client_companies | id (UUID) | 마스터 식별자 |
| **products** | **(client_company_id, sku)** | 고객사별 상품코드 = 비즈니스 식별자 |
| common_code | (code_type, code) 복합 PK | 단일 공통코드 테이블. 배송/결제/사용자상태 등 구분. |
| orders | order_id (VARCHAR) | 서버 채번. delivery_code_type+delivery_status → common_code. |
| **order_detail** | **(order_id, line_seq)** | 주문별 품목 라인. 상품 스냅샷 저장. |
| payments | id (UUID) | 멱등키는 idempotency_key 별도 |
