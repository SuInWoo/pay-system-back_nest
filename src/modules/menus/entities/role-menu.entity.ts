import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Menu } from './menu.entity';
import { Role } from '../../users/entities/role.entity';

@Entity({ name: 'role_menu' })
export class RoleMenu {
  @PrimaryColumn({ type: 'uuid', name: 'role_id' })
  roleId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'menu_id' })
  menuId!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu!: Menu;
}
