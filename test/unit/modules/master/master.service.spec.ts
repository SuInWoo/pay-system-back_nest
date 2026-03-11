import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterService } from '../../../../src/modules/master/master.service';
import { ClientCompany } from '../../../../src/modules/master/entities/client-company.entity';
import { Product } from '../../../../src/modules/master/entities/product.entity';
import { AppException } from '../../../../src/common/errors/app.exception';

type ClientRepo = Repository<ClientCompany>;
type ProductRepo = Repository<Product>;

describe('MasterService (unit)', () => {
  let service: MasterService;
  let clientRepo: jest.Mocked<ClientRepo>;
  let productRepo: jest.Mocked<ProductRepo>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterService,
        {
          provide: getRepositoryToken(ClientCompany),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MasterService);
    clientRepo = module.get(getRepositoryToken(ClientCompany));
    productRepo = module.get(getRepositoryToken(Product));
  });

  beforeEach(() => jest.clearAllMocks());

  describe('createClientCompany', () => {
    it('should throw MASTER_CLIENT_CONFLICT when code or name duplicated', async () => {
      (clientRepo.findOne as jest.Mock).mockResolvedValue({ id: 'c1' } as ClientCompany);

      await expect(
        service.createClientCompany({ code: 'C1', name: '회사', is_active: true }),
      ).rejects.toEqual(new AppException('MASTER_CLIENT_CONFLICT'));
    });
  });

  describe('createProduct', () => {
    it('should throw MASTER_CLIENT_NOT_FOUND when client does not exist', async () => {
      (clientRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createProduct({
          client_company_id: 'missing',
          sku: 'SKU1',
          name: '상품',
          price: 1000,
        }),
      ).rejects.toEqual(new AppException('MASTER_CLIENT_NOT_FOUND'));
    });
  });
});

