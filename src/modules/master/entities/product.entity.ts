import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductCategory {
  APPAREL = 'APPAREL',
  ELECTRONICS = 'ELECTRONICS',
  FOOD = 'FOOD',
}

@Entity({ name: 'products' })
@Index('uq_products_sku', ['sku'], { unique: true })
@Index('ix_products_client_company_id', ['clientCompanyId'])
@Index('ix_products_client_company_id_created_at', ['clientCompanyId', 'createdAt'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'client_company_id' })
  clientCompanyId!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 32, default: ProductCategory.APPAREL })
  category!: ProductCategory;

  @Column({ type: 'int' })
  price!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

