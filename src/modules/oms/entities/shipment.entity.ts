import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ShipmentStatus {
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
}

@Entity({ name: 'shipments' })
@Index('ix_shipments_order_id', ['orderId'])
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;

  @Column({ type: 'varchar', length: 32, name: 'status', default: ShipmentStatus.READY })
  status!: ShipmentStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  carrier!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'tracking_no', nullable: true })
  trackingNo!: string | null;

  @Column({ type: 'timestamptz', name: 'dispatched_at', nullable: true })
  dispatchedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt!: Date;
}
