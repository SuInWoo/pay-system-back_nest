import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'shipment_items' })
@Index('ix_shipment_items_shipment_id', ['shipmentId'])
export class ShipmentItem {
  @PrimaryColumn({ type: 'uuid', name: 'shipment_id' })
  shipmentId!: string;

  @PrimaryColumn({ type: 'int', name: 'line_seq' })
  lineSeq!: number;

  @Column({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;

  @Column({ type: 'varchar', length: 64 })
  sku!: string;

  @Column({ type: 'int' })
  quantity!: number;
}
