# 프론트 전달용 API 명세서 (신규 추가분만)

이 문서는 최근 백엔드 변경 중 **프론트에서 새로 사용할 수 있는 API만** 정리합니다.

---

## 1) 신규 API 요약

### 주문(OMS)

- `GET /orders/:orderId/status-history` : 주문 상태 변경 이력 조회
- `POST /orders/:orderId/shipments` : 출고 생성(부분 출고 포함)
- `POST /orders/:orderId/shipments/:shipmentId/dispatch` : 출고 확정(배송 시작)

### 결제(Payment)

- `POST /payments/:paymentId/refunds` : 부분/전체 환불 생성

### 운영(Internal)

- `POST /internal/outbox/process` : outbox PENDING 처리
- `POST /internal/outbox/retry-failed` : FAILED 재큐잉
- `GET /internal/outbox` : FAILED outbox 조회
- `POST /internal/outbox/replay/:eventId` : 단건 재발행 큐 등록
- `GET /internal/mq/dlq` : DLQ 조회
- `POST /internal/mq/dlq/:eventId/requeue` : DLQ 재큐잉

---

## 2) 상세 명세

## `GET /orders/:orderId/status-history`

### Path Params

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `orderId` | string | Y | 주문 ID (`ORD-...`) |

### 요청 예시

```http
GET /orders/ORD-20260330-000001/status-history
```

### 성공 응답 (200)

```json
[
  {
    "id": "b2e5f1f1-7f0e-4db5-b8ec-bc81dd58f66b",
    "order_id": "ORD-20260330-000001",
    "from_status": "PAYMENT_PENDING",
    "to_status": "PAYMENT_CONFIRMED",
    "changed_by_type": "SYSTEM",
    "changed_by_id": "payment-worker",
    "reason": "paymentId=PAY-20260330-000101",
    "changed_at": "2026-03-30T09:20:11.123Z"
  },
  {
    "id": "da9e7ae7-88ae-4a69-9b2e-73072c52ccf2",
    "order_id": "ORD-20260330-000001",
    "to_status": "READY_TO_SHIP",
    "changed_by_type": "ADMIN",
    "reason": "delivery status updated",
    "changed_at": "2026-03-30T10:01:42.000Z"
  }
]
```

### 실패 응답

#### 주문 없음 (404)

```json
{
  "statusCode": 404,
  "code": "ORDER_NOT_FOUND",
  "message": "주문을 찾을 수 없습니다."
}
```

---

## `POST /orders/:orderId/shipments`

### 요청 예시

```json
{
  "carrier": "CJ_LOGISTICS",
  "tracking_no": "1234-5678-9999",
  "items": [
    { "sku": "SKU-001", "quantity": 2 },
    { "sku": "SKU-002", "quantity": 1 }
  ]
}
```

### 성공 응답 (201)

```json
{
  "id": "7a0d2f6b-013c-4632-a91e-ff7c48928d22",
  "order_id": "ORD-20260330-000001",
  "status": "READY",
  "carrier": "CJ_LOGISTICS",
  "tracking_no": "1234-5678-9999"
}
```

### 실패 응답 코드

- `ORDER_NOT_FOUND` (404)
- `OMS_SHIPMENT_INVALID_SKU` (400)
- `OMS_SHIPMENT_QUANTITY_EXCEEDED` (422)

---

## `POST /orders/:orderId/shipments/:shipmentId/dispatch`

### 성공 응답 (201)

```json
{
  "id": "7a0d2f6b-013c-4632-a91e-ff7c48928d22",
  "order_id": "ORD-20260330-000001",
  "status": "DISPATCHED",
  "dispatched_at": "2026-03-30T11:20:31.110Z"
}
```

### 실패 응답 코드

- `ORDER_NOT_FOUND` (404)
- `OMS_SHIPMENT_NOT_FOUND` (404)

---

## `POST /payments/:paymentId/refunds`

### 요청 예시

```json
{
  "amount": 3000,
  "idempotency_key": "refund-550e8400-e29b-41d4-a716-446655440000",
  "reason": "고객 단순 변심"
}
```

### 성공 응답 (201)

```json
{
  "id": "52f8ef8a-f140-4a35-bd5b-c844824f0a33",
  "payment_id": "ad0ad07f-4c28-4b82-bfeb-ae44dff37496",
  "amount": 3000,
  "status": "SUCCEEDED",
  "reason": "고객 단순 변심",
  "idempotency_key": "refund-550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-03-30T11:24:01.000Z"
}
```

### 실패 응답 코드

- `PAYMENT_NOT_FOUND` (404)
- `PAYMENT_NOT_REFUNDABLE` (409)
- `OMS_REFUND_AMOUNT_EXCEEDED` (422)

---

## 3) 프론트 적용 가이드

- 주문 상세 화면에 `상태 이력` 탭/섹션을 추가합니다.
- 상세 진입 시 `GET /orders/:orderId`와 병렬 호출하거나, 탭 열릴 때 lazy fetch를 권장합니다.
- `from_status`가 없을 수 있으므로(최초 이벤트), UI에서는 `-` 또는 `초기 상태`로 표시합니다.
- `changed_at`는 사용자 타임존 포맷(`YYYY-MM-DD HH:mm:ss`)으로 렌더링합니다.
- 출고 생성 후 `dispatch` 호출 성공 시 주문 배송 상태를 즉시 갱신합니다.
- 환불 요청 성공 시 주문 상세의 결제/환불 섹션을 invalidate refetch 처리합니다.

---

## 4) 타입 예시 (TypeScript)

```ts
export interface OrderStatusHistoryItem {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  changed_by_type: string;
  changed_by_id?: string;
  reason?: string;
  changed_at: string;
}
```

