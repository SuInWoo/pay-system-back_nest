import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../../../../src/modules/oms/repositories/order.repository';
import { PaymentService } from '../../../../src/modules/payment/services/payment.service';
import { Payment, PaymentStatus } from '../../../../src/modules/payment/entities/payment.entity';
import { PaymentRepository } from '../../../../src/modules/payment/repositories/payment.repository';

describe('PaymentService (unit)', () => {
  let service: PaymentService;
  let dataSource: { createQueryRunner: jest.Mock };
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let eventEmitter: { emit: jest.Mock };

  beforeAll(async () => {
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {},
      }),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: OrderRepository, useValue: { findByOrderId: jest.fn() } },
        {
          provide: PaymentRepository,
          useValue: {
            findByIdempotencyKey: jest.fn(),
            findByIdempotencyKeyAndStatus: jest.fn(),
            findByOrderId: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    paymentRepo = module.get(PaymentRepository);
  });

  beforeEach(() => jest.clearAllMocks());

  it('should return existing succeeded payment when idempotency hit', async () => {
    (paymentRepo.findByIdempotencyKeyAndStatus as jest.Mock).mockResolvedValueOnce({
      id: 'p1',
      orderId: 'o1',
      amount: 1000,
      idempotencyKey: 'idem',
      status: PaymentStatus.SUCCEEDED,
    } as Payment);

    const result = await service.createPayment({ orderId: 'o1', amount: 1000, idempotencyKey: 'idem' });

    expect(result.id).toBe('p1');
    const qr = dataSource.createQueryRunner.mock.results[0].value;
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

