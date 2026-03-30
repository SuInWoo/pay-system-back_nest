import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterModule } from '../master/master.module';
import { OmsController } from './controllers/oms.controller';
import { OutboxOpsController } from './controllers/outbox-ops.controller';
import { OrderDetail } from './entities/order-detail.entity';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OutboxEvent } from './entities/outbox-event.entity';
import { Shipment } from './entities/shipment.entity';
import { ShipmentItem } from './entities/shipment-item.entity';
import { OmsService } from './services/oms.service';
import { OrderDetailRepository } from './repositories/order-detail.repository';
import { OrderRepository } from './repositories/order.repository';
import { OrderStatusHistoryRepository } from './repositories/order-status-history.repository';
import { OutboxEventRepository } from './repositories/outbox-event.repository';
import { ShipmentRepository } from './repositories/shipment.repository';
import { ShipmentItemRepository } from './repositories/shipment-item.repository';
import { OutboxOpsService } from './services/outbox-ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderDetail,
      OrderStatusHistory,
      OutboxEvent,
      Shipment,
      ShipmentItem,
    ]),
    MasterModule,
  ],
  controllers: [OmsController, OutboxOpsController],
  providers: [
    OmsService,
    OutboxOpsService,
    OrderRepository,
    OrderDetailRepository,
    OrderStatusHistoryRepository,
    OutboxEventRepository,
    ShipmentRepository,
    ShipmentItemRepository,
  ],
  exports: [OmsService, OrderRepository],
})
export class OmsModule {}

