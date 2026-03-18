import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ClientCompany } from './entities/client-company.entity';
import { Product } from './entities/product.entity';
import { ClientCompanyRepository } from './repositories/client-company.repository';
import { ProductRepository } from './repositories/product.repository';

@Injectable()
export class MasterService {
  constructor(
    private readonly clientRepo: ClientCompanyRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async createClientCompany(dto: CreateClientCompanyDto) {
    // code/name은 마스터 식별자 성격이라 중복을 명확히 차단합니다(계약 안정성).
    const existing = await this.clientRepo.findByCodeOrName(dto.code, dto.name);
    if (existing) throw new AppException('MASTER_CLIENT_CONFLICT');

    const entity = this.clientRepo.create({
      code: dto.code,
      name: dto.name,
      isActive: dto.is_active ?? true,
    });
    const saved = await this.clientRepo.save(entity);
    return this.toClient(saved);
  }

  async listClientCompanies() {
    const rows = await this.clientRepo.findAllOrderByCreatedDesc();
    return rows.map((r) => this.toClient(r));
  }

  async createProduct(dto: CreateProductDto) {
    // FK를 DB에서 강제하지 않는 대신, 서비스에서 선검증해서 404 계약을 지킵니다.
    const client = await this.clientRepo.findById(dto.client_company_id);
    if (!client) throw new AppException('MASTER_CLIENT_NOT_FOUND');

    // sku는 외부 연동/정산 등에서 키로 쓰이기 쉬워 전역 유니크로 운영합니다.
    const existingSku = await this.productRepo.findBySku(dto.sku);
    if (existingSku) throw new AppException('MASTER_PRODUCT_SKU_CONFLICT');

    const entity = this.productRepo.create({
      clientCompanyId: dto.client_company_id,
      sku: dto.sku,
      name: dto.name,
      price: dto.price,
      isActive: dto.is_active ?? true,
    });
    const saved = await this.productRepo.save(entity);
    return this.toProduct(saved);
  }

  async getProduct(id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) throw new AppException('PRODUCT_NOT_FOUND');
    return this.toProduct(product);
  }

  async listProducts(params?: { client_company_id?: string }) {
    const rows = await this.productRepo.findAll({
      clientCompanyId: params?.client_company_id,
    });
    return rows.map((r) => this.toProduct(r));
  }

  private toClient(c: ClientCompany) {
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      is_active: c.isActive,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }

  private toProduct(p: Product) {
    return {
      id: p.id,
      client_company_id: p.clientCompanyId,
      sku: p.sku,
      name: p.name,
      price: p.price,
      is_active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }
}

