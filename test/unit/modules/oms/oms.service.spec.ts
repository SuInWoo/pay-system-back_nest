import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ProductRepository } from '../../../../src/modules/master/repositories/product.repository';
import { OrderDetailRepository } from '../../../../src/modules/oms/repositories/order-detail.repository';
import { OrderRepository } from '../../../../src/modules/oms/repositories/order.repository';
import { OrderStatusHistoryRepository } from '../../../../src/modules/oms/repositories/order-status-history.repository';
import { OutboxEventRepository } from '../../../../src/modules/oms/repositories/outbox-event.repository';
import { ShipmentItemRepository } from '../../../../src/modules/oms/repositories/shipment-item.repository';
import { ShipmentRepository } from '../../../../src/modules/oms/repositories/shipment.repository';
import { OmsService } from '../../../../src/modules/oms/services/oms.service';

describe('OmsService (unit)', () => {
  let service: OmsService;
  let orderRepo: jest.Mocked<OrderRepository>;
  let orderStatusHistoryRepo: jest.Mocked<OrderStatusHistoryRepository>;
  let outboxEventRepo: jest.Mocked<OutboxEventRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OmsService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: OrderRepository,
          useValue: {
            findByOrderId: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: OrderDetailRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findByOrderIdOrderByLineSeq: jest.fn(),
            getOrderTotals: jest.fn(),
            getMaxLineSeq: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findByClientCompanyIdAndSku: jest.fn(),
          },
        },
        {
          provide: OrderStatusHistoryRepository,
          useValue: {
            create: jest.fn((d) => d),
            save: jest.fn(),
            findByOrderId: jest.fn(),
          },
        },
        {
          provide: OutboxEventRepository,
          useValue: {
            create: jest.fn((d) => d),
            save: jest.fn(),
          },
        },
        {
          provide: ShipmentRepository,
          useValue: {
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            create: jest.fn((d) => d),
            save: jest.fn(),
          },
        },
        {
          provide: ShipmentItemRepository,
          useValue: {
            findByShipmentId: jest.fn(),
            sumShippedQuantityByOrderAndSku: jest.fn().mockResolvedValue(0),
            create: jest.fn((d) => d),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OmsService);
    orderRepo = module.get(OrderRepository);
    orderStatusHistoryRepo = module.get(OrderStatusHistoryRepository);
    outboxEventRepo = module.get(OutboxEventRepository);
  });

  beforeEach(() => jest.clearAllMocks());

  it('결제 이벤트 수신 시 기존 주문에 상태이력과 outbox를 남긴다', async () => {
    orderRepo.findByOrderId.mockResolvedValueOnce({
      orderId: 'ORD-1',
      deliveryStatus: 'WAITING',
    } as any);

    const result = await service.onPaymentCreated({
      orderId: 'ORD-1',
      paymentId: 'PAY-1',
      amount: 1000,
      occurredAt: new Date().toISOString(),
    });

    expect(result).toBeTruthy();
    expect(orderStatusHistoryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORD-1',
        toStatus: 'PAYMENT_CONFIRMED',
      }),
    );
    expect(orderStatusHistoryRepo.save).toHaveBeenCalledTimes(1);
    expect(outboxEventRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'ORD-1',
        eventType: 'PaymentConfirmed',
      }),
    );
    expect(outboxEventRepo.save).toHaveBeenCalledTimes(1);
  });

  it('주문 상태 이력 조회 시 정렬된 응답을 반환한다', async () => {
    orderRepo.findByOrderId.mockResolvedValueOnce({ orderId: 'ORD-2' } as any);
    orderStatusHistoryRepo.findByOrderId.mockResolvedValueOnce([
      {
        id: 'h1',
        orderId: 'ORD-2',
        fromStatus: null,
        toStatus: 'CREATED',
        changedByType: 'SYSTEM',
        changedById: null,
        reason: 'order created',
        changedAt: new Date('2026-03-30T00:00:00.000Z'),
      } as any,
    ]);

    const rows = await service.getOrderStatusHistory('ORD-2');
    expect(rows).toEqual([
      expect.objectContaining({
        order_id: 'ORD-2',
        to_status: 'CREATED',
      }),
    ]);
  });
});
