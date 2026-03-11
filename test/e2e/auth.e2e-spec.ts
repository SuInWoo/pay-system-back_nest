import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

const RUN_DB = process.env.RUN_DB_TESTS === 'true';
const describeIfDb = RUN_DB ? describe : describe.skip;

describeIfDb('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register + login + me flow', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = 'password1234';

    // register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    // login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
        expect(res.body.access_token).toBeDefined();
      });

    const token = loginRes.body.access_token;

    // me
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

