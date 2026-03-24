import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { piiTransformer } from '../../../common/crypto/pii-encryption';
import { User } from './user.entity';

@Entity({ name: 'user_addresses' })
@Index('ix_user_addresses_user_id', ['userId'])
@Index('ix_user_addresses_user_id_default', ['userId', 'isDefault'])
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', name: 'receiver_name', transformer: piiTransformer })
  receiverName!: string;

  @Column({ type: 'text', name: 'phone', transformer: piiTransformer })
  phone!: string;

  @Column({ type: 'text', name: 'zip_code', nullable: true, transformer: piiTransformer })
  zipCode!: string | null;

  @Column({ type: 'text', name: 'address1', transformer: piiTransformer })
  address1!: string;

  @Column({ type: 'text', name: 'address2', nullable: true, transformer: piiTransformer })
  address2!: string | null;

  @Column({ type: 'varchar', length: 120, name: 'label', default: '기본 배송지' })
  label!: string;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
