import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../master/entities/product.entity';
import { OmsController } from './controllers/oms.controller';
import { OrderDetail } from './entities/order-detail.entity';
import { Order } from './entities/order.entity';
import { OmsService } from './services/oms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail, Product]),
  ],
  controllers: [OmsController],
  providers: [OmsService],
  exports: [OmsService],
})
export class OmsModule {}

