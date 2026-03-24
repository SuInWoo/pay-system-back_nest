import { Test, TestingModule } from '@nestjs/testing';
import { MasterService } from '../../../../src/modules/master/master.service';
import { ProductCategory } from '../../../../src/modules/master/entities/product.entity';
import { ClientCompanyRepository } from '../../../../src/modules/master/repositories/client-company.repository';
import { ProductRepository } from '../../../../src/modules/master/repositories/product.repository';
import { AppException } from '../../../../src/common/errors/app.exception';

describe('MasterService (unit)', () => {
  let service: MasterService;
  let clientRepo: jest.Mocked<ClientCompanyRepository>;
  let productRepo: jest.Mocked<ProductRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterService,
        {
          provide: ClientCompanyRepository,
          useValue: {
            findByCodeOrName: jest.fn(),
            findById: jest.fn(),
            findAllOrderByCreatedDesc: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findBySku: jest.fn(),
            findAll: jest.fn(),
            findPage: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MasterService);
    clientRepo = module.get(ClientCompanyRepository);
    productRepo = module.get(ProductRepository);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('createClientCompany', () => {
    it('should throw MASTER_CLIENT_CONFLICT when code or name duplicated', async () => {
      (clientRepo.findByCodeOrName as jest.Mock).mockResolvedValue({ id: 'c1' });

      await expect(
        service.createClientCompany({ code: 'C1', name: '회사', is_active: true }),
      ).rejects.toEqual(new AppException('MASTER_CLIENT_CONFLICT'));
    });
  });

  describe('createProduct', () => {
    it('should throw MASTER_CLIENT_NOT_FOUND when client does not exist', async () => {
      (clientRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createProduct({
          client_company_id: 'missing',
          sku: 'SKU1',
          name: '상품',
          category: ProductCategory.APPAREL,
          price: 1000,
        }),
      ).rejects.toEqual(new AppException('MASTER_CLIENT_NOT_FOUND'));
    });
  });

  describe('listProducts', () => {
    it('should return items + pagination meta', async () => {
      (productRepo.findPage as jest.Mock).mockResolvedValue([
        [
          {
            id: 'p1',
            clientCompanyId: 'c1',
            sku: 'SKU1',
            name: '상품1',
            category: ProductCategory.APPAREL,
            price: 1000,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        21,
      ]);

      const result = await service.listProducts({ page: 2, limit: 10 });

      expect(productRepo.findPage).toHaveBeenCalledWith({
        clientCompanyId: undefined,
        category: undefined,
        skip: 10,
        take: 10,
      });
      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasPrev: true,
        hasNext: true,
      });
    });
  });
});

