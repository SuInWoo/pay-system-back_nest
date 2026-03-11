import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { v4 as uuidv4 } from 'uuid';

const RUN_DB = process.env.RUN_DB_TESTS === 'true';
const describeIfDb = RUN_DB ? describe : describe.skip;

describeIfDb('Payment API idempotency (e2e)', () => {
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

  it('should create only one SUCCEEDED payment for same idempotency key', async () => {
    const orderId = `ORD-${Date.now()}`;
    const idem = `e2e-${uuidv4()}`;
    const amount = 1234;

    const server = app.getHttpServer();

    const first = await request(server)
      .post('/payments')
      .send({ order_id: orderId, amount, idempotency_key: idem })
      .expect(201);

    const second = await request(server)
      .post('/payments')
      .send({ order_id: orderId, amount, idempotency_key: idem })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    expect(second.body.id).toBe(first.body.id);
  });
});

