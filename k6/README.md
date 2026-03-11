# k6 부하/스모크 테스트

프론트 없이 API만 대상으로 부하 테스트를 수행합니다.

## 설치

- k6 설치: `https://k6.io/docs/get-started/installation/`

## 스모크 실행 (가볍게)

```bash
# 기본: BASE_URL=http://localhost:8080, VUS=1, ITER=3
k6 run k6/pay-system.smoke.js

# 원하는 값으로 조절
BASE_URL="http://localhost:8080" VUS=5 ITER=20 k6 run k6/pay-system.smoke.js
```

## 환경변수

- `BASE_URL`: API 서버 주소 (기본 `http://localhost:8080`)
- `VUS`: 동시 사용자 수 (기본 1)
- `ITER`: VU당 반복 횟수 (기본 3)
- `EMAIL`: 고정 계정으로만 돌리고 싶을 때 (기본은 VU별 랜덤 생성)
- `PASSWORD`: 비밀번호 (기본 `password1234`)

## 시나리오 흐름

1. `POST /auth/register` 시도 후 `POST /auth/login`으로 토큰 획득
2. 마스터 데이터 준비(고객사/상품 생성 후 목록 조회)
3. `POST /payments`로 결제 생성(멱등키 포함) → OMS 이벤트로 주문 생성
4. `GET /orders/:orderId` 조회 (짧게 재시도)
5. (가능하면) `POST /orders/:orderId/details`로 상세 1건 추가

