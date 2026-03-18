import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  findBySku(sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { sku } });
  }

  findByClientCompanyIdAndSku(clientCompanyId: string, sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { clientCompanyId, sku } });
  }

  findAll(params?: { clientCompanyId?: string }): Promise<Product[]> {
    const where = params?.clientCompanyId
      ? { clientCompanyId: params.clientCompanyId }
      : {};
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  create(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  save(entity: Product): Promise<Product> {
    return this.repo.save(entity);
  }
}
