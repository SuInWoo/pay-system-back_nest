import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  findByIdempotencyKeyAndStatus(
    key: string,
    status: PaymentStatus,
    manager?: EntityManager,
  ): Promise<Payment | null> {
    const target = manager ? manager.getRepository(Payment) : this.repo;
    return target.findOne({ where: { idempotencyKey: key, status } });
  }

  findAll(params?: { orderId?: string }): Promise<Payment[]> {
    const where = params?.orderId ? { orderId: params.orderId } : {};
    return this.repo.find({ where, order: { id: 'DESC' } });
  }
}
