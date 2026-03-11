import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, QueryRunner } from 'typeorm';
import { Payment, PaymentStatus } from '../../../../src/modules/payment/entities/payment.entity';
import { PaymentService } from '../../../../src/modules/payment/services/payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let queryRunner: Partial<QueryRunner>;
  let paymentRepo: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const mockPayment = {
    id: 'pay-1',
    orderId: 'order-1',
    amount: 1000,
    idempotencyKey: 'idem-1',
    status: PaymentStatus.SUCCEEDED,
  };

  beforeEach(async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_, attrs) => attrs),
      save: jest.fn().mockResolvedValue(mockPayment),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager,
    };
    paymentRepo = { findOne: jest.fn().mockResolvedValue(null) };
    eventEmitter = { emit: jest.fn() };

    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
      ],
    }).compile();

    service = moduleRef.get(PaymentService);
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('동일 idempotency_key로 이미 SUCCEEDED 있으면 기존 결제 반환(멱등)', async () => {
      (queryRunner.manager!.findOne as jest.Mock).mockResolvedValue(mockPayment);
      const out = await service.createPayment({
        orderId: 'order-1',
        amount: 1000,
        idempotencyKey: 'idem-1',
      });
      expect(out.id).toBe(mockPayment.id);
      expect(out.order_id).toBe('order-1');
      expect(out.status).toBe(PaymentStatus.SUCCEEDED);
      expect(queryRunner.manager!.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('신규 결제 시 저장 후 payment.created 이벤트 발행', async () => {
      const out = await service.createPayment({
        orderId: 'order-1',
        amount: 1000,
        idempotencyKey: 'idem-1',
      });
      expect(queryRunner.manager!.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.created',
        expect.objectContaining({
          orderId: 'order-1',
          paymentId: mockPayment.id,
          amount: 1000,
        }),
      );
      expect(out.idempotency_key).toBe('idem-1');
    });

    it('유니크 위반(23505) 시 기존 결제 조회 후 반환', async () => {
      (queryRunner.manager!.save as jest.Mock).mockRejectedValue({
        code: '23505',
      });
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      const out = await service.createPayment({
        orderId: 'order-1',
        amount: 1000,
        idempotencyKey: 'idem-1',
      });
      expect(paymentRepo.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'idem-1' },
      });
      expect(out.id).toBe(mockPayment.id);
    });
  });
});
