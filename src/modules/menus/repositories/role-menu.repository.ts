import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleMenu } from '../entities/role-menu.entity';

@Injectable()
export class RoleMenuRepository {
  constructor(
    @InjectRepository(RoleMenu)
    private readonly repo: Repository<RoleMenu>,
  ) {}

  findMenuIdsByRoleId(roleId: string): Promise<string[]> {
    return this.repo
      .find({ where: { roleId }, select: ['menuId'] })
      .then((rows) => rows.map((r) => r.menuId));
  }

  async setMenusForRole(roleId: string, menuIds: string[]): Promise<void> {
    await this.repo.delete({ roleId });
    if (menuIds.length === 0) return;
    const rows = menuIds.map((menuId) => this.repo.create({ roleId, menuId }));
    await this.repo.save(rows);
  }

  findRoleIdsByMenuId(menuId: string): Promise<string[]> {
    return this.repo
      .find({ where: { menuId }, select: ['roleId'] })
      .then((rows) => rows.map((r) => r.roleId));
  }

  deleteByRole(roleId: string): Promise<void> {
    return this.repo.delete({ roleId }).then(() => undefined);
  }

  deleteByMenu(menuId: string): Promise<void> {
    return this.repo.delete({ menuId }).then(() => undefined);
  }

  findByRoleAndMenus(roleId: string, menuIds: string[]): Promise<RoleMenu[]> {
    if (menuIds.length === 0) return Promise.resolve([]);
    return this.repo.find({
      where: { roleId, menuId: In(menuIds) },
    });
  }
}
