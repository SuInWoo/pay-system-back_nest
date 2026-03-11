import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

const shouldRun = process.env.RUN_DB_TESTS === 'true';

(shouldRun ? describe : describe.skip)('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    const email = `e2e-${Date.now()}@test.com`;
    const password = 'password1234';

    it('정상 요청 시 201, user + access_token + refresh_token 반환', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);
      expect(res.body.user).toMatchObject({ email });
      expect(res.body.user.id).toBeDefined();
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe('Bearer');
      expect(res.body.expires_in).toBeGreaterThan(0);
    });

    it('동일 이메일 재가입 시 409, code=USER_EMAIL_CONFLICT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'otherpass' })
        .expect(409);
      expect(res.body.code).toBe('USER_EMAIL_CONFLICT');
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    const email = `login-${Date.now()}@test.com`;
    const password = 'password1234';

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);
    });

    it('정상 로그인 시 201, 토큰 반환', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(email);
    });

    it('없는 이메일 시 401, code=AUTH_INVALID_CREDENTIALS', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'any' })
        .expect(401);
      expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('잘못된 비밀번호 시 401, code=AUTH_INVALID_CREDENTIALS', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrongpassword' })
        .expect(401);
      expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me, POST /auth/logout', () => {
    let accessToken: string;
    const email = `me-${Date.now()}@test.com`;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'password1234' })
        .expect(201);
      accessToken = res.body.access_token;
    });

    it('Bearer 토큰으로 /auth/me 호출 시 200, user 반환', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.user).toMatchObject({ email });
    });

    it('토큰 없이 /auth/me 호출 시 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('POST /auth/logout 시 200, ok: true', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(res.body.ok).toBe(true);
    });
  });
});
