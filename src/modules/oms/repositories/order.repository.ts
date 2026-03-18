import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  findByOrderId(orderId: string): Promise<Order | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  findByOrdererUserId(ordererUserId: string): Promise<Order[]> {
    return this.repo.find({
      where: { ordererUserId },
      order: { orderId: 'DESC' },
    });
  }

  findAll(): Promise<Order[]> {
    return this.repo.find({ order: { orderId: 'DESC' } });
  }

  create(data: Partial<Order>): Order {
    return this.repo.create(data);
  }

  save(entity: Order): Promise<Order> {
    return this.repo.save(entity);
  }

  update(orderId: string, partial: Partial<Order>): Promise<void> {
    return this.repo.update({ orderId }, partial).then(() => undefined);
  }
}
