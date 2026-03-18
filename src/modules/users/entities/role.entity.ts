import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export const ROLE_CODE = {
  DEVELOPER: 'DEVELOPER',
  CLIENT_ADMIN: 'CLIENT_ADMIN',
  CUSTOMER: 'CUSTOMER',
} as const;

export type RoleCode = (typeof ROLE_CODE)[keyof typeof ROLE_CODE];

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: RoleCode;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @OneToMany(() => User, (u) => u.role)
  users?: User[];
}
