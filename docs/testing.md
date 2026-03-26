# 테스트 (QA 담당자 정리)

## 프로젝트 구조 (시니어 권장: 테스트는 test/ 아래 모듈 구조)

- **단위 테스트**: `test/unit/` — `src`와 대응하는 폴더 구조
- **E2E/통합**: `test/e2e/` — API·통합 시나리오
- **설정**: `test/jest-unit.json`, `test/jest-e2e.json`

```
test/
├── jest-unit.json
├── jest-e2e.json
├── unit/
│   ├── app/
│   │   └── app.controller.spec.ts
│   └── modules/
│       ├── users/
│       │   └── users.service.spec.ts
│       ├── auth/
│       │   └── auth.service.spec.ts
│       ├── master/
│       │   └── master.service.spec.ts
│       └── payment/
│           └── payment.service.spec.ts
└── e2e/
    ├── app.e2e-spec.ts
    ├── auth.e2e-spec.ts
    ├── master.e2e-spec.ts
    └── payment.idempotency.int.spec.ts
```

## 모듈/API별 테스트 케이스

### 단위 테스트 (DB 불필요, `npm test`)

| 대상 | 파일 | 케이스 요약 |
|------|------|-------------|
| **App** | `test/unit/app/app.controller.spec.ts` | 루트 GET Hello World |
| **Users** | `test/unit/modules/users/users.service.spec.ts` | createUser(중복 → USER_EMAIL_CONFLICT, 정상), validatePassword, verifyRefreshToken, clearRefreshToken |
| **Auth** | `test/unit/modules/auth/auth.service.spec.ts` | register, login(유저 없음/비밀번호 오류/정상), logout, refresh |
| **Master** | `test/unit/modules/master/master.service.spec.ts` | createClientCompany, listClientCompanies, createProduct(고객사 없음/sku 중복/정상), listProducts |
| **Payment** | `test/unit/modules/payment/payment.service.spec.ts` | createPayment(멱등, 신규 이벤트, 23505 시 기존 반환) |

### E2E 테스트 (DB 필요 시 `RUN_DB_TESTS=true npm run test:e2e`)

| 대상 | 파일 | 케이스 요약 |
|------|------|-------------|
| **App** | `test/e2e/app.e2e-spec.ts` | GET / → 200 (DB 없이 실행) |
| **Auth API** | `test/e2e/auth.e2e-spec.ts` | register + login + me 플로우 검증 |
| **Master API** | `test/e2e/master.e2e-spec.ts` | client-company 생성 → product 생성 → product 목록 조회 |
| **Payment API** | `test/e2e/payment.idempotency.int.spec.ts` | 동일 idempotency_key 재요청 시 동일 payment id 반환 |

## 실행 방법

- **단위**: `npm test` → `test/unit/` 기준
- **E2E(DB 없이)**: `npm run test:e2e` → App 1건만 실행, 나머지 스킵
- **E2E(DB 연결)**: Postgres 준비 후 `RUN_DB_TESTS=true npm run test:e2e` (Windows: `set RUN_DB_TESTS=true && npm run test:e2e`)
