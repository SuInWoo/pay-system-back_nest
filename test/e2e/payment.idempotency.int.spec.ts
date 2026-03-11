import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

const shouldRun = process.env.RUN_DB_TESTS === 'true';

(shouldRun ? describe : describe.skip)(
  'Payment idempotency (integration)',
  () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('same idempotency_key returns same result', async () => {
      const body = {
        order_id: 'order-1',
        amount: 1000,
        idempotency_key: 'idem-1',
      };

      const r1 = await request(app.getHttpServer())
        .post('/payments')
        .send(body)
        .expect(201);
      const r2 = await request(app.getHttpServer())
        .post('/payments')
        .send(body)
        .expect(201);

      expect(r2.body.id).toBe(r1.body.id);
      expect(r2.body.idempotency_key).toBe('idem-1');
      expect(r2.body.order_id).toBe('order-1');
      expect(r2.body.status).toBeDefined();
    });

    it('concurrent same idempotency_key creates only one payment', async () => {
      const body = {
        order_id: 'order-2',
        amount: 2000,
        idempotency_key: 'idem-2',
      };

      const results = await Promise.all(
        Array.from({ length: 20 }).map(() =>
          request(app.getHttpServer()).post('/payments').send(body),
        ),
      );

      const ids = results.map((r) => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1);
    });
  },
);
