import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { RoleRepository } from '../users/repositories/role.repository';
import { Menu } from './entities/menu.entity';
import { MenuRepository } from './repositories/menu.repository';
import { RoleMenuRepository } from './repositories/role-menu.repository';

export type MenuTreeNode = {
  id: string;
  code: string;
  path: string;
  label: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: MenuTreeNode[];
};

export type MenuResponseItem = {
  path: string;
  label: string;
  code: string;
  sortOrder: number;
  children?: MenuResponseItem[];
};

@Injectable()
export class MenusService {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly roleMenuRepo: RoleMenuRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async getMenusForRole(roleCode: string): Promise<MenuResponseItem[]> {
    const role = await this.roleRepo.findByCode(roleCode as import('../users/entities/role.entity').RoleCode);
    if (!role) return [];

    const menuIds = await this.roleMenuRepo.findMenuIdsByRoleId(role.id);
    if (menuIds.length === 0) return [];

    const allMenus = await this.menuRepo.findAll({ activeOnly: true });
    const allowedSet = new Set(menuIds);
    const byParent = new Map<string | null, Menu[]>();
    for (const m of allMenus) {
      if (!allowedSet.has(m.id)) continue;
      const key = m.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(m);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const build = (parentId: string | null): MenuResponseItem[] => {
      const items = byParent.get(parentId) ?? [];
      return items.map((m) => ({
        path: m.path,
        label: m.label,
        code: m.code,
        sortOrder: m.sortOrder,
        children: build(m.id).length ? build(m.id) : undefined,
      }));
    };
    return build(null);
  }

  async listMenus(options?: { tree?: boolean }): Promise<Menu[] | MenuTreeNode[]> {
    const all = await this.menuRepo.findAll({ activeOnly: false });
    if (!options?.tree) return all;

    const byParent = new Map<string | null, Menu[]>();
    for (const m of all) {
      const key = m.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(m);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const build = (parentId: string | null): MenuTreeNode[] => {
      const items = byParent.get(parentId) ?? [];
      return items.map((m) => ({
        id: m.id,
        code: m.code,
        path: m.path,
        label: m.label,
        icon: m.icon,
        parentId: m.parentId,
        sortOrder: m.sortOrder,
        isActive: m.isActive,
        children: build(m.id),
      }));
    };
    return build(null);
  }

  async getMenu(id: string): Promise<Menu> {
    const menu = await this.menuRepo.findById(id);
    if (!menu) throw new AppException('MENU_NOT_FOUND');
    return menu;
  }

  async createMenu(data: {
    code: string;
    path?: string;
    label: string;
    icon?: string;
    parentId?: string;
    sortOrder?: number;
  }): Promise<Menu> {
    const existing = await this.menuRepo.findByCode(data.code);
    if (existing) throw new AppException('MENU_CODE_CONFLICT');
    const menu = this.menuRepo.create({
      code: data.code,
      path: data.path ?? '',
      label: data.label,
      icon: data.icon ?? null,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: true,
    });
    return this.menuRepo.save(menu);
  }

  async updateMenu(
    id: string,
    data: Partial<{ path: string; label: string; icon: string; parentId: string | null; sortOrder: number; isActive: boolean }>,
  ): Promise<Menu> {
    const menu = await this.menuRepo.findById(id);
    if (!menu) throw new AppException('MENU_NOT_FOUND');
    Object.assign(menu, data);
    return this.menuRepo.save(menu);
  }

  async deleteMenu(id: string): Promise<void> {
    const menu = await this.menuRepo.findById(id);
    if (!menu) throw new AppException('MENU_NOT_FOUND');
    await this.roleMenuRepo.deleteByMenu(id);
    await this.menuRepo.delete(id);
  }

  async getMenusByRoleId(roleId: string): Promise<string[]> {
    return this.roleMenuRepo.findMenuIdsByRoleId(roleId);
  }

  async setMenusForRole(roleId: string, menuIds: string[]): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new AppException('ROLE_NOT_FOUND');
    await this.roleMenuRepo.setMenusForRole(roleId, menuIds);
  }
}
