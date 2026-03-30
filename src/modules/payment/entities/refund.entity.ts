import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum RefundStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

@Entity({ name: 'refunds' })
@Index('ix_refunds_payment_id_created_at', ['paymentId', 'createdAt'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 32, name: 'status', default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key' })
  idempotencyKey!: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt!: Date;
}
