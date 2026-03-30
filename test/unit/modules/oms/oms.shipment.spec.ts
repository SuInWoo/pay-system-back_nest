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

describe('OmsService Shipment (unit)', () => {
  let service: OmsService;
  let shipmentRepo: jest.Mocked<ShipmentRepository>;

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
            findByOrderId: jest.fn().mockResolvedValue({ orderId: 'ORD-1' }),
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
            findByOrderIdOrderByLineSeq: jest.fn().mockResolvedValue([{ sku: 'SKU-1', quantity: 2 }]),
            getOrderTotals: jest.fn(),
            getMaxLineSeq: jest.fn(),
          },
        },
        { provide: ProductRepository, useValue: { findByClientCompanyIdAndSku: jest.fn() } },
        { provide: OrderStatusHistoryRepository, useValue: { create: jest.fn((d) => d), save: jest.fn(), findByOrderId: jest.fn() } },
        { provide: OutboxEventRepository, useValue: { create: jest.fn((d) => d), save: jest.fn() } },
        {
          provide: ShipmentRepository,
          useValue: {
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            create: jest.fn((d) => d),
            save: jest.fn().mockImplementation(async (d) => ({ id: 'SHP-1', ...d })),
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
    shipmentRepo = module.get(ShipmentRepository);
  });

  beforeEach(() => jest.clearAllMocks());

  it('출고 생성 시 shipment 정보를 반환한다', async () => {
    const result = await service.createShipment('ORD-1', {
      carrier: 'CJ',
      tracking_no: 'TRACK-1',
      items: [{ sku: 'SKU-1', quantity: 1 }],
    });
    expect(shipmentRepo.save).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 'SHP-1',
        order_id: 'ORD-1',
      }),
    );
  });
});
