import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../../../../src/modules/payment/services/payment.service';
import { Payment, PaymentStatus } from '../../../../src/modules/payment/entities/payment.entity';

type PaymentRepo = Repository<Payment>;

describe('PaymentService (unit)', () => {
  let service: PaymentService;
  let dataSource: { createQueryRunner: jest.Mock };
  let paymentRepo: jest.Mocked<PaymentRepo>;
  let eventEmitter: { emit: jest.Mock };

  beforeAll(async () => {
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      }),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    paymentRepo = module.get(getRepositoryToken(Payment));
  });

  beforeEach(() => jest.clearAllMocks());

  it('should return existing succeeded payment when idempotency hit', async () => {
    const qr = dataSource.createQueryRunner.mock.results[0].value;
    qr.manager.findOne.mockResolvedValueOnce({
      id: 'p1',
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'idem',
      status: PaymentStatus.SUCCEEDED,
    } as Payment);

    const result = await service.createPayment({ orderId: 'o1', amount: 1000, idempotencyKey: 'idem' });

    expect(result.id).toBe('p1');
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

