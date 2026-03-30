import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from '../entities/refund.entity';

@Injectable()
export class RefundRepository {
  constructor(
    @InjectRepository(Refund)
    private readonly repo: Repository<Refund>,
  ) {}

  findByIdempotencyKey(key: string): Promise<Refund | null> {
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  findByPaymentId(paymentId: string): Promise<Refund[]> {
    return this.repo.find({
      where: { paymentId },
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<Refund>): Refund {
    return this.repo.create(data);
  }

  save(entity: Refund): Promise<Refund> {
    return this.repo.save(entity);
  }
}
