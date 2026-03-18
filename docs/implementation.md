# 구현 가이드

## Failed to fetch 대응 절차

프론트엔드에서 API 호출 시 `TypeError: Failed to fetch`가 발생하면 아래를 순서대로 확인합니다.

---

### 1. 확인할 점

| # | 확인 항목 | 설명 |
|---|-----------|------|
| 1 | **백엔드 실행 여부** | `http://localhost:8080`에서 백엔드가 실행 중인지 확인 |
| 2 | **CORS 설정** | 백엔드 CORS에 프론트엔드 오리진(`http://localhost:3000`)이 허용되어 있는지 |
| 3 | **URL 일치** | 프론트엔드 `NEXT_PUBLIC_API_URL` 등이 실제 백엔드 주소와 일치하는지 |
| 4 | **네트워크** | 방화벽, VPN, 로컬 네트워크 제한 등으로 차단되지 않는지 |

---

### 2. 백엔드 CORS 설정 (NestJS)

```typescript
// main.ts 예시
app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: true,
});
```

환경변수 사용 시:

```bash
CORS_ORIGINS=http://localhost:3000,https://myapp.example.com
```

---

### 3. 프론트엔드 에러 처리 권장

`TypeError`이며 `message === "Failed to fetch"`인 경우, 사용자에게 다음 메시지 표시를 권장합니다.

> **서버에 연결할 수 없습니다. 백엔드 실행 여부와 CORS 설정을 확인해주세요.**

#### 구현 예시 (lib/constants/errors.ts)

```typescript
// TypeError이며 message === "Failed to fetch"인 경우
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "서버에 연결할 수 없습니다. 백엔드 실행 여부와 CORS 설정을 확인해주세요.";
  }
  // ... 기존 에러 매핑
};
```

---

### 4. 체크리스트

- [ ] 백엔드가 `pnpm start` 또는 `pnpm start:dev`로 실행 중인가?
- [ ] `PORT=8080`(또는 설정한 포트)에서 listening 중인가?
- [ ] CORS에 `http://localhost:3000`이 포함되어 있는가?
- [ ] 프론트엔드 API URL이 `http://localhost:8080`으로 설정되어 있는가?
