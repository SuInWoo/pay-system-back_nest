import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'order_status_history' })
@Index('ix_order_status_history_order_id_changed_at', ['orderId', 'changedAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;

  @Column({ type: 'varchar', length: 32, name: 'from_status', nullable: true })
  fromStatus!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'to_status' })
  toStatus!: string;

  @Column({ type: 'varchar', length: 32, name: 'changed_by_type', default: 'SYSTEM' })
  changedByType!: string;

  @Column({ type: 'varchar', length: 128, name: 'changed_by_id', nullable: true })
  changedById!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'now()' })
  changedAt!: Date;
}
