import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

const RUN_DB = process.env.RUN_DB_TESTS === 'true';
const describeIfDb = RUN_DB ? describe : describe.skip;

describeIfDb('Master API (e2e)', () => {
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

  it('client-companies + products basic flow', async () => {
    const code = `C_${Date.now()}`;
    const name = `고객사_${code}`;

    // create client company
    const createClientRes = await request(app.getHttpServer())
      .post('/master/client-companies')
      .send({ code, name, is_active: true })
      .expect(201);

    const clientId = createClientRes.body.id;

    // create product
    const sku = `SKU_${Date.now()}`;
    await request(app.getHttpServer())
      .post('/master/products')
      .send({
        client_company_id: clientId,
        sku,
        name: `상품_${sku}`,
        price: 1000,
        is_active: true,
      })
      .expect(201);

    // list products
    await request(app.getHttpServer())
      .get(`/master/products?client_company_id=${clientId}`)
      .expect(200);
  });
});

