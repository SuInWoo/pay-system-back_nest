import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../../../../src/modules/oms/repositories/order.repository';
import { PaymentStatus } from '../../../../src/modules/payment/entities/payment.entity';
import { PaymentRepository } from '../../../../src/modules/payment/repositories/payment.repository';
import { RefundRepository } from '../../../../src/modules/payment/repositories/refund.repository';
import { PaymentService } from '../../../../src/modules/payment/services/payment.service';

describe('PaymentService Refund (unit)', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let refundRepo: jest.Mocked<RefundRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: OrderRepository, useValue: { findByOrderId: jest.fn() } },
        {
          provide: PaymentRepository,
          useValue: {
            findById: jest.fn(),
            findByIdempotencyKey: jest.fn(),
            findByIdempotencyKeyAndStatus: jest.fn(),
            findByOrderId: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RefundRepository,
          useValue: {
            findByIdempotencyKey: jest.fn(),
            findByPaymentId: jest.fn(),
            create: jest.fn((d) => d),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    paymentRepo = module.get(PaymentRepository);
    refundRepo = module.get(RefundRepository);
  });

  beforeEach(() => jest.clearAllMocks());

  it('환불 금액이 결제 금액을 넘으면 예외를 던진다', async () => {
    paymentRepo.findById.mockResolvedValueOnce({
      id: 'PAY-1',
      orderId: 'ORD-1',
      amount: 10000,
      status: PaymentStatus.SUCCEEDED,
    } as any);
    refundRepo.findByIdempotencyKey.mockResolvedValueOnce(null);
    refundRepo.findByPaymentId.mockResolvedValueOnce([{ amount: 9000 }] as any);

    await expect(
      service.createRefund('PAY-1', {
        amount: 2000,
        idempotency_key: 'refund-key-1',
        reason: 'test',
      }),
    ).rejects.toMatchObject({ code: 'OMS_REFUND_AMOUNT_EXCEEDED' });
  });
});
