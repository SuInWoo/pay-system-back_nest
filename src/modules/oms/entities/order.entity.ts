import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { piiTransformer } from '../../../common/crypto/pii-encryption';
import { User } from '../../users/entities/user.entity';

export enum DeliveryStatus {
  WAITING = 'WAITING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'order_id' })
  orderId!: string;

  @Column({ type: 'varchar', length: 64, name: 'delivery_code_type', default: 'DELIVERY_STATUS' })
  deliveryCodeType!: string;

  @Column({ type: 'varchar', length: 32, name: 'delivery_status' })
  deliveryStatus!: DeliveryStatus;

  @Column({ type: 'text', transformer: piiTransformer })
  address!: string;

  @Column({ type: 'int', name: 'total_quantity', default: 0 })
  totalQuantity!: number;

  @Column({ type: 'int', name: 'total_amount', default: 0 })
  totalAmount!: number;

  @Column({ type: 'uuid', name: 'orderer_user_id', nullable: true })
  ordererUserId!: string | null;

  @Column({ type: 'text', name: 'orderer_name', nullable: true, transformer: piiTransformer })
  ordererName!: string | null;

  @Column({ type: 'text', name: 'orderer_phone', nullable: true, transformer: piiTransformer })
  ordererPhone!: string | null;

  @Column({ type: 'text', name: 'orderer_email', nullable: true, transformer: piiTransformer })
  ordererEmail!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderer_user_id' })
  ordererUser?: User | null;
}

