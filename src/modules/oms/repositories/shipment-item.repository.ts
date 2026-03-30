import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentItem } from '../entities/shipment-item.entity';

@Injectable()
export class ShipmentItemRepository {
  constructor(
    @InjectRepository(ShipmentItem)
    private readonly repo: Repository<ShipmentItem>,
  ) {}

  findByShipmentId(shipmentId: string): Promise<ShipmentItem[]> {
    return this.repo.find({
      where: { shipmentId },
      order: { lineSeq: 'ASC' },
    });
  }

  async sumShippedQuantityByOrderAndSku(orderId: string, sku: string): Promise<number> {
    const raw = await this.repo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('si.order_id = :orderId', { orderId })
      .andWhere('si.sku = :sku', { sku })
      .getRawOne<{ sum: string }>();
    return parseInt(raw?.sum ?? '0', 10);
  }

  create(data: Partial<ShipmentItem>): ShipmentItem {
    return this.repo.create(data);
  }

  save(entity: ShipmentItem): Promise<ShipmentItem> {
    return this.repo.save(entity);
  }
}
