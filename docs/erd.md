# Pay System ERD

SQL 담당자 설계 반영: 단일 common_code(code_type+code), 주문 총수량·총금액·주문자, 주문 상세, 채번.

## Mermaid ERD

```mermaid
erDiagram
  roles {
    uuid id PK
    varchar code UK
    varchar name
    int sort_order
  }

  menus {
    uuid id PK
    varchar code UK
    varchar path
    varchar label
    varchar icon
    uuid parent_id FK
    int sort_order
    boolean is_active
    timestamptz created_at
    timestamptz updated_at
  }

  role_menu {
    uuid role_id PK_FK
    uuid menu_id PK_FK
  }

  common_code {
    varchar code_type PK
    varchar code PK
    varchar name
    int sort_order
  }

  users {
    uuid id PK
    varchar name
    varchar email UK
    varchar password_hash
    varchar status
    uuid role_id FK
    varchar refresh_token_hash
    uuid client_company_id
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
    uuid id PK
    uuid client_company_id FK
    varchar sku UK
    varchar name
    varchar category
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
    timestamptz created_at
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
    varchar payment_key
    varchar method
    varchar provider_status
    timestamptz approved_at
  }

  user_profiles {
    uuid user_id PK_FK
    text phone
    text email
    text name
    timestamptz created_at
    timestamptz updated_at
  }

  user_addresses {
    uuid id PK
    uuid user_id FK
    text receiver_name
    text phone
    text zip_code
    text address1
    text address2
    varchar label
    boolean is_default
    timestamptz created_at
    timestamptz updated_at
  }

  roles ||--o{ users : "role_id"
  roles ||--o{ role_menu : "role_id"
  menus ||--o{ role_menu : "menu_id"
  menus ||--o{ menus : "parent_id"
  common_code ||--o{ orders : "delivery_code_type, delivery_status"
  common_code ||--o{ payments : "payment_code_type, status"
  users ||--o{ orders : "orderer_user_id"
  client_companies ||--o{ products : "1:N"
  users ||--|| user_profiles : "1:1"
  users ||--o{ user_addresses : "1:N"
  orders ||--o{ order_detail : "1:N (주문 상세)"
  payments }o--|| orders : "order_id (논리 참조, 서버 채번)"
```

## 관계 요약

| 관계 | 설명 |
|------|------|
| **client_companies → products** | 1:N. products는 `id` PK + `client_company_id` FK. `sku`는 전역 유니크. |
| **orders → order_detail** | 1:N. 주문 1건당 상세 라인 N개. PK `(order_id, line_seq)`. 상품은 논리 참조(client_company_id, sku)+스냅샷(product_name, unit_price). |
| **common_code → orders** | 배송상태. orders (delivery_code_type, delivery_status) 복합 FK. |
| **common_code → payments** | 결제상태. payments (payment_code_type, status) 복합 FK. |
| **users → orders** | 주문자(회원). orders.orderer_user_id FK, nullable. |
| **users → user_profiles** | 1:1. user_profiles.user_id PK/FK, 사용자 개인정보 프로필. |
| **users → user_addresses** | 1:N. 사용자 배송지 다건 저장. |
| **payments → orders** | 논리적 1:1. `payments.order_id` = `orders.order_id`. 주문번호는 서버 채번 권장. |
| **roles → users** | 1:N. 역할(DEVELOPER/CLIENT_ADMIN/CUSTOMER). users.role_id FK, nullable(기존 사용자 대응). |
| **users** | 인증/세션용. 역할은 roles 테이블 참조. |

## 테이블 생성 순서 (FK 기준)

1. `roles` (시드)
2. `users` (→ roles)
3. `common_code` (code_type, code 복합 PK, 시드)
4. `client_companies`
5. `products` (→ client_companies)
6. `order_seq` (시퀀스)
7. `orders` (→ common_code 복합 FK, users)
8. `order_detail` (→ orders)
9. `payments` (→ common_code 복합 FK, order_id는 orders FK 미적용)
10. `user_profiles` (→ users)
11. `user_addresses` (→ users)

## PK/식별자 정책

| 테이블 | PK | 비고 |
|--------|-----|------|
| roles | id (UUID) | code UK. DEVELOPER/CLIENT_ADMIN/CUSTOMER |
| users | id (UUID) | 인증용, role_id → roles |
| client_companies | id (UUID) | 마스터 식별자 |
| products | id (UUID) | `client_company_id` FK + `sku` UK |
| common_code | (code_type, code) 복합 PK | 단일 공통코드 테이블. 배송/결제/사용자상태 등 구분. |
| orders | order_id (VARCHAR) | 서버 채번. delivery_code_type+delivery_status → common_code. |
| **order_detail** | **(order_id, line_seq)** | 주문별 품목 라인. 상품 스냅샷 저장. |
| payments | id (UUID) | 멱등키는 idempotency_key 별도 |
