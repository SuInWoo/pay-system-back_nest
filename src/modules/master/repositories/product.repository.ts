import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Product, ProductCategory } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { sku } });
  }

  findByClientCompanyIdAndSku(clientCompanyId: string, sku: string): Promise<Product | null> {
    return this.repo.findOne({ where: { clientCompanyId, sku } });
  }

  findAll(params?: { clientCompanyId?: string; category?: ProductCategory }): Promise<Product[]> {
    const where = this.buildWhere(params);
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  findPage(params: {
    clientCompanyId?: string;
    category?: ProductCategory;
    skip: number;
    take: number;
  }): Promise<[Product[], number]> {
    const where = this.buildWhere(params);
    return this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: params.skip,
      take: params.take,
    });
  }

  create(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  save(entity: Product): Promise<Product> {
    return this.repo.save(entity);
  }

  private buildWhere(params?: {
    clientCompanyId?: string;
    category?: ProductCategory;
  }): FindOptionsWhere<Product> {
    return {
      ...(params?.clientCompanyId ? { clientCompanyId: params.clientCompanyId } : {}),
      ...(params?.category ? { category: params.category } : {}),
    };
  }
}
