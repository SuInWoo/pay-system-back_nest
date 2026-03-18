import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterModule } from '../master/master.module';
import { OmsController } from './controllers/oms.controller';
import { OrderDetail } from './entities/order-detail.entity';
import { Order } from './entities/order.entity';
import { OmsService } from './services/oms.service';
import { OrderDetailRepository } from './repositories/order-detail.repository';
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderDetail]), MasterModule],
  controllers: [OmsController],
  providers: [OmsService, OrderRepository, OrderDetailRepository],
  exports: [OmsService],
})
export class OmsModule {}

