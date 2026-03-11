import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'order_detail' })
@Index('ix_order_detail_order_id', ['orderId'])
export class OrderDetail {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;

  @PrimaryColumn({ type: 'int', name: 'line_seq' })
  lineSeq!: number;

  @Column({ type: 'uuid', name: 'client_company_id' })
  clientCompanyId!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'varchar', length: 200, name: 'product_name' })
  productName!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', name: 'unit_price' })
  unitPrice!: number;
}
