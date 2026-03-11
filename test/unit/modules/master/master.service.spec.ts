import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppException } from '../../../../src/common/errors/app.exception';
import { ClientCompany } from '../../../../src/modules/master/entities/client-company.entity';
import { Product } from '../../../../src/modules/master/entities/product.entity';
import { MasterService } from '../../../../src/modules/master/master.service';

describe('MasterService', () => {
  let service: MasterService;
  let clientRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let productRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const mockClient = {
    id: 'client-1',
    code: 'ACME',
    name: 'Acme',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockProduct = {
    id: 'product-1',
    clientCompanyId: 'client-1',
    sku: 'SKU-001',
    name: '상품1',
    price: 10000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    clientRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ ...x, id: mockClient.id })),
    };
    productRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ ...x, id: mockProduct.id })),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MasterService,
        { provide: getRepositoryToken(ClientCompany), useValue: clientRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();
    service = moduleRef.get(MasterService);
    jest.clearAllMocks();
  });

  describe('createClientCompany', () => {
    it('code/name 중복이면 MASTER_CLIENT_CONFLICT', async () => {
      clientRepo.findOne.mockResolvedValue(mockClient);
      await expect(
        service.createClientCompany({ name: 'Acme', code: 'ACME' }),
      ).rejects.toMatchObject({ code: 'MASTER_CLIENT_CONFLICT' });
    });

    it('정상 시 고객사 생성 후 snake_case 응답', async () => {
      clientRepo.save.mockResolvedValue(mockClient);
      const out = await service.createClientCompany({
        name: 'Acme',
        code: 'ACME',
      });
      expect(clientRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ACME',
          name: 'Acme',
          isActive: true,
        }),
      );
      expect(out.code).toBe('ACME');
      expect(out.name).toBe('Acme');
      expect(out.is_active).toBe(true);
    });
  });

  describe('listClientCompanies', () => {
    it('전체 목록 생성일 내림차순으로 반환', async () => {
      clientRepo.find.mockResolvedValue([mockClient]);
      const list = await service.listClientCompanies();
      expect(clientRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(list).toHaveLength(1);
      expect(list[0]).toHaveProperty('is_active');
    });
  });

  describe('createProduct', () => {
    it('고객사 없으면 MASTER_CLIENT_NOT_FOUND', async () => {
      clientRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createProduct({
          client_company_id: 'none',
          sku: 'SKU-1',
          name: '상품',
          price: 1000,
        }),
      ).rejects.toMatchObject({ code: 'MASTER_CLIENT_NOT_FOUND' });
    });

    it('sku 중복이면 MASTER_PRODUCT_SKU_CONFLICT', async () => {
      clientRepo.findOne.mockResolvedValue(mockClient);
      productRepo.findOne.mockResolvedValue(mockProduct);
      await expect(
        service.createProduct({
          client_company_id: 'client-1',
          sku: 'SKU-001',
          name: '상품',
          price: 1000,
        }),
      ).rejects.toMatchObject({ code: 'MASTER_PRODUCT_SKU_CONFLICT' });
    });

    it('정상 시 상품 생성 후 snake_case 응답', async () => {
      clientRepo.findOne.mockResolvedValue(mockClient);
      productRepo.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: mockProduct.id }),
      );
      const out = await service.createProduct({
        client_company_id: 'client-1',
        sku: 'SKU-002',
        name: '상품2',
        price: 2000,
      });
      expect(out.sku).toBe('SKU-002');
      expect(out.client_company_id).toBe('client-1');
      expect(out.price).toBe(2000);
    });
  });

  describe('listProducts', () => {
    it('client_company_id 없으면 전체 조회', async () => {
      productRepo.find.mockResolvedValue([mockProduct]);
      const list = await service.listProducts();
      expect(productRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(list).toHaveLength(1);
    });

    it('client_company_id 있으면 해당 고객사 상품만 조회', async () => {
      await service.listProducts({ client_company_id: 'client-1' });
      expect(productRepo.find).toHaveBeenCalledWith({
        where: { clientCompanyId: 'client-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
