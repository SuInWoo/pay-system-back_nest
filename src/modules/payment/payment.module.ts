import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OmsModule } from '../oms/oms.module';
import { PaymentController } from './controllers/payment.controller';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { RefundRepository } from './repositories/refund.repository';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Payment, Refund]), OmsModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, RefundRepository],
  exports: [PaymentService],
})
export class PaymentModule {}

