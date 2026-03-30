import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween, randomItem, uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    smoke: {
      executor: 'per-vu-iterations',
      vus: __ENV.VUS ? Number(__ENV.VUS) : 1,
      iterations: __ENV.ITER ? Number(__ENV.ITER) : 3,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE_URL = (__ENV.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const PASSWORD = __ENV.PASSWORD ?? 'password1234';

function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function registerOrLogin(email) {
  // 1) register 시도 (이미 있으면 실패 가능)
  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: `k6_${__VU}`, email, password: PASSWORD }),
    { headers: jsonHeaders() },
  );

  // 2) login (register가 실패해도 login은 시도)
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: jsonHeaders() },
  );

  check(loginRes, {
    'login 200': (r) => r.status === 200,
    'login has access_token': (r) => !!(r.json('access_token') || r.json('accessToken')),
  });

  return {
    accessToken: loginRes.json('access_token'),
    refreshToken: loginRes.json('refresh_token'),
    user: loginRes.json('user'),
    regStatus: regRes.status,
  };
}

function ensureMasterData(token) {
  // 기존 데이터가 있을 수도 있으니, 생성 실패는 무시하고 list 결과를 사용
  const clientCode = `CLIENT_${randomIntBetween(1000, 9999)}`;
  const clientName = `테스트고객사_${clientCode}`;

  http.post(
    `${BASE_URL}/master/client-companies`,
    JSON.stringify({ code: clientCode, name: clientName, is_active: true }),
    { headers: jsonHeaders(token) },
  );

  const clientsRes = http.get(`${BASE_URL}/master/client-companies`, { headers: jsonHeaders(token) });
  check(clientsRes, { 'list client companies 200': (r) => r.status === 200 });
  const clients = clientsRes.json();
  const client = Array.isArray(clients) && clients.length ? randomItem(clients) : null;
  if (!client?.id) return null;

  const sku = `SKU_${randomIntBetween(100000, 999999)}`;
  http.post(
    `${BASE_URL}/master/products`,
    JSON.stringify({
      client_company_id: client.id,
      sku,
      name: `상품_${sku}`,
      category: randomItem(['APPAREL', 'ELECTRONICS', 'FOOD']),
      price: randomIntBetween(1000, 20000),
      is_active: true,
    }),
    { headers: jsonHeaders(token) },
  );

  const productsRes = http.get(`${BASE_URL}/master/products?client_company_id=${client.id}`, {
    headers: jsonHeaders(token),
  });
  check(productsRes, { 'list products 200': (r) => r.status === 200 });
  const products = productsRes.json();
  const product = Array.isArray(products) && products.length ? randomItem(products) : null;
  if (!product?.sku) return null;

  return { clientCompanyId: client.id, sku: product.sku };
}

export default function () {
  const email = __ENV.EMAIL ?? `vu${__VU}_${uuidv4()}@example.com`;
  const { accessToken } = registerOrLogin(email);
  sleep(0.2);

  // 마스터 데이터 준비 (옵션)
  const master = ensureMasterData(accessToken);
  sleep(0.2);

  // 결제 생성 → OMS에서 주문 생성 이벤트를 수신해 order가 생김
  const orderId = `ORD-${String(Date.now())}-${__VU}-${__ITER}`;
  const paymentRes = http.post(
    `${BASE_URL}/payments`,
    JSON.stringify({
      order_id: orderId,
      amount: randomIntBetween(1000, 50000),
      idempotency_key: `k6-${uuidv4()}`,
    }),
    { headers: jsonHeaders(accessToken) },
  );
  check(paymentRes, { 'create payment 201/200': (r) => r.status === 201 || r.status === 200 });
  const paymentId = paymentRes.json('id');
  sleep(0.2);

  // 주문 조회 (이벤트 처리 타이밍 고려: 짧게 재시도)
  let orderRes;
  for (let i = 0; i < 5; i++) {
    orderRes = http.get(`${BASE_URL}/orders/${orderId}`, { headers: jsonHeaders(accessToken) });
    if (orderRes.status === 200) break;
    sleep(0.2);
  }
  check(orderRes, { 'get order 200': (r) => r.status === 200 });

  // 상세 추가(가능한 경우)
  if (master) {
    const addRes = http.post(
      `${BASE_URL}/orders/${orderId}/details`,
      JSON.stringify({
        items: [
          {
            client_company_id: master.clientCompanyId,
            sku: master.sku,
            quantity: randomIntBetween(1, 5),
          },
        ],
      }),
      { headers: jsonHeaders(accessToken) },
    );
    check(addRes, { 'add order details 201/200': (r) => r.status === 201 || r.status === 200 });
  }

  // 신규: 주문 상태 이력 조회
  if ((__ENV.ENABLE_STATUS_HISTORY ?? '1') === '1') {
    const histRes = http.get(`${BASE_URL}/orders/${orderId}/status-history`, { headers: jsonHeaders(accessToken) });
    check(histRes, { 'get status history 200': (r) => r.status === 200 });
  }

  // 신규: 출고 생성 + 출고 확정(배송 시작)
  // - 출고는 주문 상세(order_detail)가 있어야 SKU 검증이 통과합니다. (master 데이터가 없으면 skip)
  if ((__ENV.ENABLE_SHIPMENT ?? '1') === '1' && master) {
    const createShipmentRes = http.post(
      `${BASE_URL}/orders/${orderId}/shipments`,
      JSON.stringify({
        carrier: randomItem(['CJ_LOGISTICS', 'HANJIN', 'LOTTE']),
        tracking_no: `TRACK-${randomIntBetween(100000, 999999)}-${__VU}-${__ITER}`,
        items: [{ sku: master.sku, quantity: 1 }],
      }),
      { headers: jsonHeaders(accessToken) },
    );
    check(createShipmentRes, { 'create shipment 201/200': (r) => r.status === 201 || r.status === 200 });
    const shipmentId = createShipmentRes.json('id');
    if (shipmentId) {
      const dispatchRes = http.post(
        `${BASE_URL}/orders/${orderId}/shipments/${shipmentId}/dispatch`,
        null,
        { headers: jsonHeaders(accessToken) },
      );
      check(dispatchRes, { 'dispatch shipment 201/200': (r) => r.status === 201 || r.status === 200 });
    }
  }

  // 신규: 환불 생성 (부분환불)
  if ((__ENV.ENABLE_REFUND ?? '1') === '1' && paymentId) {
    const refundRes = http.post(
      `${BASE_URL}/payments/${paymentId}/refunds`,
      JSON.stringify({
        amount: 100,
        idempotency_key: `refund-${uuidv4()}`,
        reason: 'k6 partial refund',
      }),
      { headers: jsonHeaders(accessToken) },
    );
    check(refundRes, { 'create refund 201/200': (r) => r.status === 201 || r.status === 200 });
  }

  // 신규: outbox 운영 API (수동 워커 대체)
  if ((__ENV.ENABLE_OUTBOX_OPS ?? '1') === '1') {
    const processRes = http.post(`${BASE_URL}/internal/outbox/process`, null, { headers: jsonHeaders(accessToken) });
    check(processRes, { 'outbox process 201/200': (r) => r.status === 201 || r.status === 200 });
  }

  sleep(0.3);
}

