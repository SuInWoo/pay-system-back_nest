## 1. k6 도입 배경

### 왜 k6를 선택했는가

- 스크립트 기반으로 Git에 함께 버전 관리가 가능해, “어떤 부하 조건에서 어떤 결과가 나왔는지”를 기록으로 남길 수 있다.
- CLI로 쉽게 실행할 수 있고, 추후 Grafana/Prometheus 등과 연동해 대시보드를 구성하기에도 적합하다.

### 목표

- 결제/주문/유저 핵심 플로우에 대한 성능 기준 설정
- 병목 지점 찾기, 현실적인 트래픽 가정 테스트

---

## 2. 시나리오 설계

### 테스트 대상 플로우

- 회원가입(또는 기존 유저 로그인)으로 토큰 획득
- 마스터 데이터(고객사/상품) 준비
- `POST /payments` 결제 생성(멱등 키 포함)
- `GET /orders/:orderId` 주문 조회
- 가능 시 `POST /orders/:orderId/details` 상세 추가

### 부하 패턴

- 현재: `per-vu-iterations` 기반 스모크 테스트
- 기본값: `VUS=1`, `ITER=3`, `maxDuration=2m`

### 성능 지표

- 응답 시간(p95, p99)
- 에러율
- k6 thresholds: `http_req_failed: rate < 0.01`
- k6 thresholds: `http_req_duration: p(95) < 800ms`

---

## 3. k6 스크립트 구조

### 폴더/파일 구조

- `k6/pay-system.smoke.js`
- `k6/README.md`

### 스크립트 구성 요소

- 옵션: `scenarios.smoke`, `thresholds`
- 유틸: `jsonHeaders`, `registerOrLogin`, `ensureMasterData`
- 메인 시나리오: 결제 생성 -> 주문 조회 -> 주문 상세 추가

---

## 4. 실행 방법 · 결과 해석

### 실행 명령 예시

- `k6 run k6/pay-system.smoke.js`
- `BASE_URL="http://localhost:8080" VUS=5 ITER=20 k6 run k6/pay-system.smoke.js`

### 결과에서 보는 포인트

- 응답 시간 분포
- 실패 요청 유형(타임아웃, 5xx 등)
- `auth/login`, `payments`, `orders/:id` 구간별 병목 여부

---

## 5. 앞으로의 디벨롭 계획

### 단계 1 – 기본 시나리오 완성

- 현재 스모크 시나리오를 기준선으로 유지

### 단계 2 – 환경별 비교

- 로컬/스테이징(있다면) 간 비교
- 설정/캐시/DB 인덱스 조정 전후 비교

### 단계 3 – 운영 수준 목표 설정

- ramp-up/spike 시나리오 추가
- CI에서 주기 실행 가능한 경량 성능 게이트 정의

---

## 6. 개인 회고 · 느낀 점

### 이번 챕터에서 느낀 점

- 막연한 “빠르게”가 아니라, 숫자로 보는 성능(p95, 에러율 등)이 있어야만 진짜 대화를 할 수 있다는 걸 느꼈다.

### 배운 것

- k6 시나리오를 코드로 관리하면, 환경·설정·코드 변경 전후의 성능 차이를 실험처럼 반복 검증할 수 있다는 점.

### 다음에 더 시도해보고 싶은 것

- Grafana/Prometheus 등과 연동해서 대시보드까지 구축하고, 주문/결제·유저 플로우를 실시간으로 모니터링해 보는 것.

