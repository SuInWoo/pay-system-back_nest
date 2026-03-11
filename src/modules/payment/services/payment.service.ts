import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentCreatedEvent } from '../events/payment-created.event';
import { PaymentResult } from './payment.types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async createPayment(params: {
    orderId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<PaymentResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSucceeded = await queryRunner.manager.findOne(Payment, {
        where: { idempotencyKey: params.idempotencyKey, status: PaymentStatus.SUCCEEDED },
      });
      if (existingSucceeded) {
        await queryRunner.commitTransaction();
        return this.toResult(existingSucceeded);
      }

      const payment = queryRunner.manager.create(Payment, {
        orderId: params.orderId,
        amount: params.amount,
        idempotencyKey: params.idempotencyKey,
        status: PaymentStatus.SUCCEEDED,
      });

      const saved = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit(
        'payment.created',
        new PaymentCreatedEvent({
          orderId: saved.orderId,
          paymentId: saved.id,
          amount: saved.amount,
          occurredAt: new Date().toISOString(),
        }),
      );

      return this.toResult(saved);
    } catch (e: any) {
      await queryRunner.rollbackTransaction();

      // Postgres unique_violation
      if (e?.code === '23505') {
        const existing = await this.paymentRepo.findOne({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existing) return this.toResult(existing);
      }

      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private toResult(p: Payment): PaymentResult {
    return {
      id: p.id,
      order_id: p.orderId,
      amount: p.amount,
      status: p.status,
      idempotency_key: p.idempotencyKey,
    };
  }
}

