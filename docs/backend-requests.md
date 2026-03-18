# 백엔드 연동 요청사항

프론트엔드 개발 시 백엔드 측에서 확인·설정해야 할 사항입니다.

---

## CORS 설정

### 개요

프론트엔드(예: Next.js `http://localhost:3000`)에서 백엔드 API(`http://localhost:8080`)를 호출할 때, 브라우저의 **same-origin 정책** 때문에 CORS(Cross-Origin Resource Sharing) 설정이 필요합니다.

### 백엔드 설정 (NestJS)

이 프로젝트는 `main.ts`에서 CORS를 활성화합니다.

```typescript
app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: true,
});
```

### 환경변수로 오리진 제어

`CORS_ORIGINS` 환경변수로 허용 오리진을 설정할 수 있습니다.

```bash
# .env
CORS_ORIGINS=http://localhost:3000,https://myapp.example.com
```

쉼표로 구분하며, 미설정 시 기본값 `http://localhost:3000`이 적용됩니다.

### 확인할 점

| 항목 | 확인 |
|------|------|
| 백엔드 실행 | `http://localhost:8080`에서 실행 중인지 |
| CORS 오리진 | 프론트엔드 주소(`http://localhost:3000` 등)가 허용되었는지 |
| credentials | 쿠키/인증 헤더 사용 시 `credentials: true` 필요 |

### Swagger와 CORS

Swagger UI(`http://localhost:8080/api`)는 백엔드와 같은 오리진이므로 CORS 적용 대상이 아닙니다.
