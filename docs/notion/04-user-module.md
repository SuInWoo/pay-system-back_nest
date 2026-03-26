## 1. 유저 모듈 개요

### 역할

- 회원 계정, 인증 토큰, 내 프로필/배송지 관리

### 주요 책임

- 회원가입/로그인/토큰 갱신/로그아웃
- 역할(Role) 조회 및 사용자 권한 컨텍스트 제공
- 내 프로필/배송지 CRUD

### 주요 연관 도메인

- 주문, 결제, 인증/보안

---

## 2. 아키텍처 · 설계

### 모듈 구조

- `AuthModule` + `UsersModule` 분리
- `AuthController/AuthService`, `UsersService`, `UserRepository` 계층

### 핵심 엔티티/테이블

- `users`, `roles`, `user_profiles`, `user_addresses`

### 보안·개인정보 관점 고려 사항

- 비밀번호/리프레시 토큰은 bcrypt 해시만 저장(평문 저장 금지)
- refresh 토큰은 로그인/refresh 시 회전(rotate) 정책
- JWT access/refresh secret 및 만료시간은 환경변수 기반

---

## 3. API 설계

### 주요 API 목록

- `POST /auth/register` : 회원가입
- `POST /auth/login` : 로그인
- `POST /auth/logout` : 로그아웃(인증 필요)
- `POST /auth/refresh` : 토큰 갱신(인증 필요)
- `GET /auth/me` : 내 정보 + 메뉴 조회(인증 필요)
- `GET /auth/roles` : 역할 목록 조회(인증 필요)
- `GET/POST /auth/me/profile` : 내 프로필 조회/저장
- `GET/POST /auth/me/addresses` : 내 배송지 조회/생성
- `POST /auth/me/addresses/:id` : 내 배송지 수정
- `POST /auth/me/addresses/:id/default` : 기본 배송지 설정

### 주문/결제와의 연동 포인트

- 유저 ID 기반으로 주문/결제 히스토리 조회
- 주문 생성/조회 권한 제어 시 JWT payload(`role`, `clientCompanyId`) 활용
- 결제/주문 API 호출 시 `Authorization: Bearer` 기반 사용자 컨텍스트 전달

---

## 4. 테스트 전략 (유저 모듈)

### 단위 테스트

- 비밀번호/토큰 관련 로직
- 권한(Authorization) 체크 로직

### 통합 테스트

- `test/e2e/auth.e2e-spec.ts`: register + login + me 플로우
- `test/unit/modules/users/users.service.spec.ts`: 유저 서비스 단위 검증
- `test/unit/modules/auth/auth.service.spec.ts`: 인증 서비스 단위 검증

---

## 5. 리스크 · TODO

### 리스크

- 현재 리프레시 토큰은 사용자당 단일 해시 저장 방식이라 다중 디바이스 세션 요구사항과 충돌 가능
- 계정 잠금/비정상 로그인 탐지/2차 인증 정책은 미구현

### 앞으로 개선하고 싶은 점

- 소셜 로그인/외부 인증 연동
- 권한(관리자/일반 유저 등) 세분화
- 디바이스 단위 세션 관리(다중 refresh 토큰)
- 개인정보 마스킹/보존/삭제 정책 문서화와 운영 정책 연동

---

## 6. 개인 회고 · 느낀 점

### 이번 챕터에서 느낀 점

- 유저 도메인이 주문·결제와 강하게 엮여 있어서, “유저 ID”가 거의 모든 로그·추적의 출발점이 된다는 걸 다시 체감했다.

### 배운 것

- 인증/인가를 “일단 로그인만 되게” 넣어두면, 나중에 권한·운영·감사 요구사항이 생겼을 때 거의 처음부터 다시 설계해야 한다는 교훈.

### 다음 챕터(k6·성능 테스트)에서 더 신경 쓸 것

- 유저 수/트래픽 스케일을 가정하고 k6 시나리오를 설계해, 인증/인가·세션·토큰 검증이 병목이 되지 않도록 미리 확인하기.

