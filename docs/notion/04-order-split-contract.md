# 주문 분할(고객사 단위) API 계약서

## 1) 변경 목적

- 장바구니에 여러 고객사 상품이 섞일 때 주문/정산/조회 기준을 일치시키기 위해, 주문 생성 시 고객사 단위로 주문을 분리한다.
- `scope=company` 조회에서 금액 불일치(주문 총액 vs 고객사 소계) 문제를 제거한다.

## 2) 적용 범위

- 대상 API: `POST /orders`
- 연관 조회 API: `GET /orders?scope=company`

## 3) 백엔드 동작 규칙

1. `POST /orders` 요청의 `items[]`를 `client_company_id` 기준으로 그룹핑한다.
2. 그룹 개수가 1개면 기존과 동일하게 단일 주문을 생성한다.
3. 그룹 개수가 2개 이상이면 그룹별 주문을 생성한다.
   - 예: base `order_id=ORD-20260326-000123`
   - 생성: `ORD-20260326-000123-01`, `ORD-20260326-000123-02`
4. 응답은 주문 묶음 단위로 반환한다.

## 4) 주문 생성 응답(신규)

```json
{
  "order_group_id": "ORD-20260326-000123",
  "total_amount": 45000,
  "total_quantity": 5,
  "orders": [
    {
      "order_id": "ORD-20260326-000123-01",
      "delivery_status": "WAITING",
      "address": "서울시 ...",
      "total_quantity": 2,
      "total_amount": 12000,
      "orderer_user_id": "uuid",
      "orderer_name": "홍길동",
      "orderer_phone": "010-xxxx-xxxx",
      "orderer_email": "user@example.com",
      "details": [
        {
          "line_seq": 1,
          "client_company_id": "a-company-uuid",
          "sku": "SKU-001",
          "product_name": "상품A",
          "quantity": 2,
          "unit_price": 6000,
          "line_amount": 12000
        }
      ]
    },
    {
      "order_id": "ORD-20260326-000123-02",
      "delivery_status": "WAITING",
      "address": "서울시 ...",
      "total_quantity": 3,
      "total_amount": 33000,
      "details": [
        {
          "line_seq": 1,
          "client_company_id": "b-company-uuid",
          "sku": "SKU-100",
          "product_name": "상품B",
          "quantity": 3,
          "unit_price": 11000,
          "line_amount": 33000
        }
      ]
    }
  ]
}
```

## 5) 프론트엔드 요청사항

1. 주문 생성 API는 고객사 단위 분할 기준으로 동작한다.
2. 요청 바디는 `items[]`, `orderer_*`, `address`로 고정한다.
3. 응답은 `order_group_id`, `orders[]`, `total_amount` 기준으로 처리한다.
4. 결제는 현재 `orders[].order_id` 단위 반복 호출 방식(A안)만 지원한다.
5. 주문 목록(`GET /orders`)은 `status`, 주문 상세(`GET /orders/:id`)는 `delivery_status`를 사용하므로 화면별 매핑이 필요하다.
6. 성공 페이지는 `order_group_id`를 기본 식별자로 사용하고, 상세/결제 이동을 위해 `order_id[]`도 함께 저장한다.

## 6) 호환/전환 계획

- 1차: 프론트가 `orders[]`를 우선 사용하도록 반영
- 2차: 기존 단일 주문 가정 로직 제거
- 3차(선택): `order_group_id` 전용 상세/결제 API 추가

