import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDetail } from '../entities/order-detail.entity';

@Injectable()
export class OrderDetailRepository {
  constructor(
    @InjectRepository(OrderDetail)
    private readonly repo: Repository<OrderDetail>,
  ) {}

  findByOrderIdOrderByLineSeq(orderId: string): Promise<OrderDetail[]> {
    return this.repo.find({
      where: { orderId },
      order: { lineSeq: 'ASC' },
    });
  }

  async getMaxLineSeq(orderId: string): Promise<number> {
    const raw = await this.repo
      .createQueryBuilder('d')
      .select('COALESCE(MAX(d.line_seq), 0)', 'max')
      .where('d.order_id = :orderId', { orderId })
      .getRawOne<{ max: string }>();
    return parseInt(raw?.max ?? '0', 10);
  }

  async getOrderTotals(orderId: string): Promise<{ totalQuantity: number; totalAmount: number }> {
    const raw = await this.repo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.quantity), 0)', 'totalQuantity')
      .addSelect('COALESCE(SUM(d.quantity * d.unit_price), 0)', 'totalAmount')
      .where('d.order_id = :orderId', { orderId })
      .getRawOne<{ totalQuantity: string; totalAmount: string }>();
    return {
      totalQuantity: parseInt(raw?.totalQuantity ?? '0', 10),
      totalAmount: parseInt(raw?.totalAmount ?? '0', 10),
    };
  }

  create(data: Partial<OrderDetail>): OrderDetail {
    return this.repo.create(data);
  }

  save(entity: OrderDetail): Promise<OrderDetail> {
    return this.repo.save(entity);
  }
}
