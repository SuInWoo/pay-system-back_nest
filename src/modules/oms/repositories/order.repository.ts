import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  findPageByOrdererUserId(params: { ordererUserId: string; skip: number; take: number }) {
    return this.repo.findAndCount({
      where: { ordererUserId: params.ordererUserId },
      order: { orderId: 'DESC' },
      skip: params.skip,
      take: params.take,
    });
  }

  async findPageByClientCompanyId(params: {
    clientCompanyId: string;
    skip: number;
    take: number;
  }): Promise<[Order[], number]> {
    const idsRaw = await this.repo
      .createQueryBuilder('o')
      .select('o.order_id', 'orderId')
      .innerJoin('order_detail', 'od', 'od.order_id = o.order_id')
      .where('od.client_company_id = :clientCompanyId', { clientCompanyId: params.clientCompanyId })
      .orderBy('o.order_id', 'DESC')
      .distinct(true)
      .getRawMany<{ orderId: string }>();

    const orderIds = idsRaw.map((r) => r.orderId);
    const total = orderIds.length;
    if (total === 0) return [[], 0];

    const pageOrderIds = orderIds.slice(params.skip, params.skip + params.take);
    if (pageOrderIds.length === 0) return [[], total];

    const rows = await this.repo.find({
      where: { orderId: In(pageOrderIds) },
      order: { orderId: 'DESC' },
    });
    return [rows, total];
  }

  findPageAll(params: { skip: number; take: number }) {
    return this.repo.findAndCount({
      order: { orderId: 'DESC' },
      skip: params.skip,
      take: params.take,
    });
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
