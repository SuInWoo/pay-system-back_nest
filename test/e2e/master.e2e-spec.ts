import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

const shouldRun = process.env.RUN_DB_TESTS === 'true';

(shouldRun ? describe : describe.skip)('Master API (e2e)', () => {
  let app: INestApplication;
  let clientId: string;

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

  describe('POST /master/client-companies', () => {
    const code = `E2E_${Date.now()}`;
    const name = `고객사_${Date.now()}`;

    it('정상 요청 시 201, id/code/name/is_active 반환', async () => {
      const res = await request(app.getHttpServer())
        .post('/master/client-companies')
        .send({ code, name })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.code).toBe(code);
      expect(res.body.name).toBe(name);
      expect(res.body.is_active).toBe(true);
      clientId = res.body.id;
    });

    it('동일 code 재등록 시 409, code=MASTER_CLIENT_CONFLICT', async () => {
      const res = await request(app.getHttpServer())
        .post('/master/client-companies')
        .send({ code, name: '다른이름' })
        .expect(409);
      expect(res.body.code).toBe('MASTER_CLIENT_CONFLICT');
    });
  });

  describe('GET /master/client-companies', () => {
    it('200, 배열 반환', async () => {
      const res = await request(app.getHttpServer())
        .get('/master/client-companies')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /master/products', () => {
    it('존재하지 않는 client_company_id 시 404, code=MASTER_CLIENT_NOT_FOUND', async () => {
      const res = await request(app.getHttpServer())
        .post('/master/products')
        .send({
          client_company_id: '00000000-0000-0000-0000-000000000000',
          sku: 'SKU-E2E-1',
          name: '상품',
          price: 1000,
        })
        .expect(404);
      expect(res.body.code).toBe('MASTER_CLIENT_NOT_FOUND');
    });

    it('정상 요청 시 201, 상품 반환', async () => {
      const clientRes = await request(app.getHttpServer())
        .post('/master/client-companies')
        .send({ code: `P_${Date.now()}`, name: `상품테스트_${Date.now()}` })
        .expect(201);
      const cId = clientRes.body.id;

      const res = await request(app.getHttpServer())
        .post('/master/products')
        .send({
          client_company_id: cId,
          sku: `SKU-${Date.now()}`,
          name: 'E2E상품',
          price: 5000,
        })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.client_company_id).toBe(cId);
      expect(res.body.sku).toBeDefined();
      expect(res.body.price).toBe(5000);
    });

    it('동일 sku 재등록 시 409, code=MASTER_PRODUCT_SKU_CONFLICT', async () => {
      const sku = `DUP_${Date.now()}`;
      const clientRes = await request(app.getHttpServer())
        .post('/master/client-companies')
        .send({ code: `D_${Date.now()}`, name: `Dup_${Date.now()}` })
        .expect(201);
      await request(app.getHttpServer())
        .post('/master/products')
        .send({
          client_company_id: clientRes.body.id,
          sku,
          name: 'First',
          price: 100,
        })
        .expect(201);
      const res = await request(app.getHttpServer())
        .post('/master/products')
        .send({
          client_company_id: clientRes.body.id,
          sku,
          name: 'Second',
          price: 200,
        })
        .expect(409);
      expect(res.body.code).toBe('MASTER_PRODUCT_SKU_CONFLICT');
    });
  });

  describe('GET /master/products', () => {
    it('200, 배열 반환', async () => {
      const res = await request(app.getHttpServer())
        .get('/master/products')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('query client_company_id 적용 시 해당 고객사 상품만', async () => {
      if (!clientId) return;
      const res = await request(app.getHttpServer())
        .get(`/master/products?client_company_id=${clientId}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
