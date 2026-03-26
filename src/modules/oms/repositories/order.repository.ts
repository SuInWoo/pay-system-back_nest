import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
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

  async findByOrdererUserIdWithFilter(params: {
    ordererUserId: string;
    orderId?: string;
  }): Promise<Order[]> {
    const qb = this.repo.createQueryBuilder('o').where('o.orderer_user_id = :ordererUserId', {
      ordererUserId: params.ordererUserId,
    });
    if (params.orderId) {
      qb.andWhere('o.order_id = :orderId', { orderId: params.orderId });
    }
    return qb.orderBy('o.order_id', 'DESC').getMany();
  }

  async findPageByOrdererUserIdWithFilter(params: {
    ordererUserId: string;
    orderId?: string;
    skip: number;
    take: number;
  }): Promise<[Order[], number]> {
    const qb = this.repo.createQueryBuilder('o').where('o.orderer_user_id = :ordererUserId', {
      ordererUserId: params.ordererUserId,
    });
    if (params.orderId) {
      qb.andWhere('o.order_id = :orderId', { orderId: params.orderId });
    }
    return qb.orderBy('o.order_id', 'DESC').skip(params.skip).take(params.take).getManyAndCount();
  }

  async findPageByClientCompanyId(params: {
    clientCompanyId: string;
    orderId?: string;
    skip: number;
    take: number;
  }): Promise<[Order[], number]> {
    const idsRaw = await this.buildCompanyScopedIdsQb({
      clientCompanyId: params.clientCompanyId,
      orderId: params.orderId,
    }).getRawMany<{ orderId: string }>();

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

  async findByClientCompanyIdWithFilter(params: {
    clientCompanyId: string;
    orderId?: string;
  }): Promise<Order[]> {
    const idsRaw = await this.buildCompanyScopedIdsQb({
      clientCompanyId: params.clientCompanyId,
      orderId: params.orderId,
    }).getRawMany<{ orderId: string }>();
    const orderIds = idsRaw.map((r) => r.orderId);
    if (orderIds.length === 0) return [];
    return this.repo.find({
      where: { orderId: In(orderIds) },
      order: { orderId: 'DESC' },
    });
  }

  async findPageAll(params: { orderId?: string; skip: number; take: number }) {
    const qb = this.repo.createQueryBuilder('o');
    if (params.orderId) {
      qb.where('o.order_id = :orderId', { orderId: params.orderId });
    }
    return qb.orderBy('o.order_id', 'DESC').skip(params.skip).take(params.take).getManyAndCount();
  }

  async findAllWithFilter(params: { orderId?: string }): Promise<Order[]> {
    const qb = this.repo.createQueryBuilder('o');
    if (params.orderId) {
      qb.where('o.order_id = :orderId', { orderId: params.orderId });
    }
    return qb.orderBy('o.order_id', 'DESC').getMany();
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

  private buildCompanyScopedIdsQb(params: {
    clientCompanyId: string;
    orderId?: string;
  }): SelectQueryBuilder<Order> {
    const qb = this.repo
      .createQueryBuilder('o')
      .select('o.order_id', 'orderId')
      .innerJoin('order_detail', 'od', 'od.order_id = o.order_id')
      .where('od.client_company_id = :clientCompanyId', { clientCompanyId: params.clientCompanyId });
    if (params.orderId) {
      qb.andWhere('o.order_id = :orderId', { orderId: params.orderId });
    }
    return qb.orderBy('o.order_id', 'DESC').distinct(true);
  }
}
