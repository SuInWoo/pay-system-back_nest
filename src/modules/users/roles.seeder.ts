import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ROLE_CODE } from './entities/role.entity';
import { RoleRepository } from './repositories/role.repository';

const SEED_ROLES = [
  { code: ROLE_CODE.DEVELOPER, name: '개발자', sortOrder: 1 },
  { code: ROLE_CODE.CLIENT_ADMIN, name: '고객사관리자', sortOrder: 2 },
  { code: ROLE_CODE.CUSTOMER, name: '고객', sortOrder: 3 },
] as const;

@Injectable()
export class RolesSeeder implements OnModuleInit {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const existing = await this.roleRepo.findAll();
    if (existing.length === 0) {
      for (const r of SEED_ROLES) {
        const role = this.roleRepo.create(r);
        await this.roleRepo.save(role);
      }
    }

    // 기존 사용자(role_id null)에게 CUSTOMER 부여
    await this.dataSource.query(
      `UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'CUSTOMER' LIMIT 1) WHERE role_id IS NULL`,
    );
  }
}
