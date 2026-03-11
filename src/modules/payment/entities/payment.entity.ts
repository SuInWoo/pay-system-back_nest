import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

@Entity({ name: 'payments' })
@Index('uq_payments_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('ix_payments_order_id', ['orderId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 64, name: 'payment_code_type', default: 'PAYMENT_STATUS' })
  paymentCodeType!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: PaymentStatus;

  @Column({ type: 'varchar', length: 128, name: 'idempotency_key' })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;
}

