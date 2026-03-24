import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, In, Repository } from 'typeorm';
import { Product, ProductCategory } from '../entities/product.entity';
import { ProductSortBy, ProductSortOrder } from '../dto/list-products-query.dto';

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

  findAll(params?: {
    clientCompanyId?: string;
    categories?: ProductCategory[];
    sortBy?: ProductSortBy;
    sortOrder?: ProductSortOrder;
  }): Promise<Product[]> {
    const where = this.buildWhere(params);
    return this.repo.find({
      where,
      order: this.buildOrder(params),
    });
  }

  findPage(params: {
    clientCompanyId?: string;
    categories?: ProductCategory[];
    sortBy?: ProductSortBy;
    sortOrder?: ProductSortOrder;
    skip: number;
    take: number;
  }): Promise<[Product[], number]> {
    const where = this.buildWhere(params);
    return this.repo.findAndCount({
      where,
      order: this.buildOrder(params),
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
    categories?: ProductCategory[];
  }): FindOptionsWhere<Product> {
    return {
      ...(params?.clientCompanyId ? { clientCompanyId: params.clientCompanyId } : {}),
      ...(params?.categories?.length ? { category: In(params.categories) } : {}),
    };
  }

  private buildOrder(params?: {
    sortBy?: ProductSortBy;
    sortOrder?: ProductSortOrder;
  }): FindOptionsOrder<Product> {
    const sortOrder = (params?.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const sortBy = params?.sortBy ?? 'created_at';
    if (sortBy === 'price') return { price: sortOrder };
    if (sortBy === 'name') return { name: sortOrder };
    return { createdAt: sortOrder };
  }
}
