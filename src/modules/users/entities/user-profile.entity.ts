import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { piiTransformer } from '../../../common/crypto/pii-encryption';
import { User } from './user.entity';

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', name: 'phone', nullable: true, transformer: piiTransformer })
  phone!: string | null;

  @Column({ type: 'text', name: 'email', nullable: true, transformer: piiTransformer })
  email!: string | null;

  @Column({ type: 'text', name: 'name', nullable: true, transformer: piiTransformer })
  name!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
