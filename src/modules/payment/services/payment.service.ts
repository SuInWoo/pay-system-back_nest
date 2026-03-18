import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentCreatedEvent } from '../events/payment-created.event';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentResult } from './payment.types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly paymentRepo: PaymentRepository,
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
      const existingSucceeded = await this.paymentRepo.findByIdempotencyKeyAndStatus(
        params.idempotencyKey,
        PaymentStatus.SUCCEEDED,
        queryRunner.manager,
      );
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
        const existing = await this.paymentRepo.findByIdempotencyKey(params.idempotencyKey);
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

