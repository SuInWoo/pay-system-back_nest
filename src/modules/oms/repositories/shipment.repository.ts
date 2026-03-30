import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../entities/shipment.entity';

@Injectable()
export class ShipmentRepository {
  constructor(
    @InjectRepository(Shipment)
    private readonly repo: Repository<Shipment>,
  ) {}

  findById(id: string): Promise<Shipment | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByOrderId(orderId: string): Promise<Shipment[]> {
    return this.repo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  create(data: Partial<Shipment>): Shipment {
    return this.repo.create(data);
  }

  save(entity: Shipment): Promise<Shipment> {
    return this.repo.save(entity);
  }
}
