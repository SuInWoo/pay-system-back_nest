import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatusHistory } from '../entities/order-status-history.entity';

@Injectable()
export class OrderStatusHistoryRepository {
  constructor(
    @InjectRepository(OrderStatusHistory)
    private readonly repo: Repository<OrderStatusHistory>,
  ) {}

  create(data: Partial<OrderStatusHistory>): OrderStatusHistory {
    return this.repo.create(data);
  }

  save(entity: OrderStatusHistory): Promise<OrderStatusHistory> {
    return this.repo.save(entity);
  }

  findByOrderId(orderId: string): Promise<OrderStatusHistory[]> {
    return this.repo.find({
      where: { orderId },
      order: { changedAt: 'ASC' },
    });
  }
}
