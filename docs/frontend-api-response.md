# 프론트엔드 API 요청에 대한 백엔드 응답

프론트엔드 측 요청 사항을 분석하고, 구현·확인 결과를 정리했습니다.

---

## 1. 주문 생성

### 응답: ✅ 이미 구현됨 + 플로우 개선

**추가·변경 사항**

- `POST /orders` API가 있습니다 (관리자 B2B용).
- `POST /orders/:orderId/details` 호출 시 **주문이 없으면 자동 생성**하도록 수정했습니다.

**프론트엔드 플로우**

| 플로우 | API | 설명 |
|--------|-----|------|
| **A** | `POST /orders` | `items[]` 기준으로 주문 묶음(`order_group_id`)과 분할 주문(`orders[]`) 생성 |
| **B** | `POST /orders/:orderId/details` | 클라이언트에서 `order_id` 생성 후 상세만 추가. **주문이 없으면 자동 생성** |

**플로우 B 사용 시**

1. `order_id`를 `ORD-YYYYMMDD-NNNNNN` 형식으로 클라이언트에서 생성
2. `POST /orders/{orderId}/details` 호출
3. 주문이 없으면 백엔드에서 빈 주문을 생성한 뒤 상세를 추가

---

## 2. 상품 단건 조회

### 응답: ✅ 추가 완료

- **API**: `GET /master/products/:id`
- **경로**: 상품 UUID (`id`)
- **응답**: 상품 상세 (id, client_company_id, sku, name, price, is_active, created_at, updated_at)
- **에러**: `PRODUCT_NOT_FOUND` (404)

---

## 3. 주문 목록

### 응답: ✅ 추가 완료

- **API**: `GET /orders`
- **쿼리**: `scope`, `page`, `limit`, `order_id`, `keyword`
- **내 주문 조회 예시**  
  1. `GET /auth/me`로 사용자 인증 정보 확인  
  2. `GET /orders?scope=my` 호출
- **응답**: `items` + `meta` 페이징 구조
- **권한 규칙**: CUSTOMER는 `my`, CLIENT_ADMIN은 `company`, ADMIN/DEVELOPER는 `all` 사용 가능

---

## 4. 결제 목록

### 응답: ✅ 추가 완료

- **API**: `GET /payments`
- **쿼리**: `order_id` (선택) — 주문 ID로 필터
- **응답**: 결제 목록 (id, order_id, amount, status, idempotency_key, payment_key, provider_status, method, approved_at)
- **참고**: 현재 인증/권한 미적용. 필요 시 `JwtAuthGuard` 등으로 관리자만 호출 가능하도록 보완 권장

---

## 5. 에러 응답 형식

### 응답: ✅ 이미 통일됨

**공통 형식**

```json
{
  "statusCode": 404,
  "code": "ORDER_NOT_FOUND",
  "message": "주문을 찾을 수 없습니다."
}
```

**검증 실패 시**

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "입력값이 올바르지 않습니다.",
  "errors": ["email must be an email"]
}
```

**에러 코드 예시**: `AUTH_UNAUTHORIZED`, `ORDER_NOT_FOUND`, `ORDER_ALREADY_EXISTS`, `PRODUCT_NOT_FOUND`, `MASTER_CLIENT_CONFLICT`, `VALIDATION_FAILED`, `INTERNAL_ERROR` 등

---

## 6. 인증·권한

### 응답: ✅ 역할(role) 기반 권한

- **API**: `GET /auth/me`
- **변경 사항**: 응답에 `role`(코드), `roleName`(표시명) 추가. `roles` 테이블로 관리

**역할 구분**

| code | name |
|------|------|
| DEVELOPER | 개발자 |
| CLIENT_ADMIN | 고객사관리자 |
| CUSTOMER | 고객 |

**응답 예시**

```json
{
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "CUSTOMER",
    "roleName": "고객",
    "menus": [
      { "path": "/dashboard", "label": "대시보드", "code": "dashboard", "sortOrder": 1, "children": [] }
    ]
  }
}
```

**역할 목록**

- **API**: `GET /auth/roles` (인증 필요) 또는 `GET /admin/roles` (DEVELOPER/CLIENT_ADMIN 전용)
- **응답**: `Role[]` (id, code, name, sortOrder)

**역할 변경**

- **API**: `PATCH /admin/users/:id/role` (DEVELOPER, CLIENT_ADMIN 전용)
- **요청**: `{ "role": "CLIENT_ADMIN" }`

**관리자 메뉴 API**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /admin/menus | 메뉴 목록(트리) |
| POST | /admin/menus | 메뉴 생성 |
| GET | /admin/menus/:id | 메뉴 단건 조회 |
| PATCH | /admin/menus/:id | 메뉴 수정 |
| DELETE | /admin/menus/:id | 메뉴 삭제 |
| GET | /admin/roles/:roleId/menus | 역할별 메뉴 ID 목록 |
| PATCH | /admin/roles/:roleId/menus | 역할별 메뉴 설정 |

**PATCH /admin/roles/:roleId/menus 요청 바디**

```json
{
  "menuIds": ["uuid1", "uuid2"]
}
```

**메뉴 트리 노드 응답 예시**

```json
{
  "id": "uuid",
  "code": "admin_products",
  "path": "/admin/products",
  "label": "상품",
  "icon": null,
  "parentId": "parent-uuid",
  "sortOrder": 3,
  "isActive": true,
  "children": [
    { "id": "...", "code": "...", "path": "...", "label": "하위메뉴", "children": [] }
  ]
}
```

---

## 7. 고객사·상품 API 인증

### 응답: 현재 인증 없음 (공개)

| API | 인증 | 비고 |
|-----|------|------|
| `GET /master/client-companies` | 없음 | 공개 |
| `GET /master/products` | 없음 | 공개 |
| `GET /master/products/:id` | 없음 | 공개 |
| `POST /master/client-companies` | 없음 | 관리자 전용으로 제한 필요 시 별도 적용 |
| `POST /master/products` | 없음 | 관리자 전용으로 제한 필요 시 별도 적용 |

상품·고객사 목록을 비로그인 상태로 노출하는 현재 설계에 맞춰, 조회 API는 인증 없이 사용 가능합니다.

---

## 8. API 베이스 경로

### 응답: 확인 결과

- **실제 API 경로**: 루트 기준 (`/`), `/api` 접두사 없음
- **예시**: `http://localhost:8080/auth/login`, `http://localhost:8080/master/products`
- **Swagger UI**: `http://localhost:8080/api`
- **프론트엔드 사용**: `NEXT_PUBLIC_API_URL=http://localhost:8080` 사용이 맞습니다.

---

## 9. 회원가입 시 이름 필드

### 응답: ✅ 추가 완료

- **API**: `POST /auth/register`
- **변경 사항**: 요청 바디에 `name` 필드 추가 (필수)

**요청 예시**

```json
{
  "name": "홍길동",
  "email": "user@example.com",
  "password": "12345678"
}
```

**응답 (회원가입·로그인 공통)**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "CUSTOMER",
    "roleName": "고객"
  },
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

- `name`: 최대 120자

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /orders | 주문 생성 |
| GET | /orders | 주문 목록 (`scope/page/limit/order_id/keyword`) |
| GET | /orders/:orderId | 주문 단건 조회 |
| POST | /orders/:orderId/details | 주문 상세 추가 (주문 없으면 자동 생성) |
| PATCH | /orders/:orderId | 주문 수정 |
| GET | /master/products/:id | 상품 단건 조회 |
| GET | /payments | 결제 목록 (`?order_id=` 옵션) |
| POST | /auth/register | 회원가입 (name, email, password 필수) |
| GET | /auth/me | 내 정보 (userId, email, name, role, roleName, menus) |
| GET | /admin/roles | 역할 목록 (DEVELOPER/CLIENT_ADMIN 전용) |
| PATCH | /admin/users/:id/role | 사용자 역할 변경 |
| GET | /auth/roles | 역할 목록 (인증 필요) |
| GET | /admin/menus | 메뉴 목록 (트리) |
| POST | /admin/menus | 메뉴 생성 |
| GET | /admin/menus/:id | 메뉴 단건 조회 |
| PATCH | /admin/menus/:id | 메뉴 수정 |
| DELETE | /admin/menus/:id | 메뉴 삭제 |
| GET | /admin/roles/:roleId/menus | 역할별 메뉴 ID 목록 |
| PATCH | /admin/roles/:roleId/menus | 역할별 메뉴 설정 |

---

## 환경변수 (신규 추가)

| 변수 | 용도 |
|------|------|
| `CORS_ORIGINS` | CORS 허용 오리진 (쉼표 구분, 기본: `http://localhost:3000`) |

---

## 10. Failed to fetch 대응

### 프론트엔드 권장 처리

`TypeError`이며 `message === "Failed to fetch"`인 경우:

- **사용자 메시지**: "서버에 연결할 수 없습니다. 백엔드 실행 여부와 CORS 설정을 확인해주세요."
- **구현 위치**: `lib/constants/errors.ts` 등 에러 매핑 모듈

### 확인할 점

1. 백엔드가 `http://localhost:8080`에서 실행 중인지
2. 백엔드 CORS에 `http://localhost:3000` 허용 여부
3. NestJS 예: `app.enableCors({ origin: ['http://localhost:3000'] })`

자세한 내용: `docs/backend-requests.md`, `docs/implementation.md`
