import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleCode } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: RoleCode): Promise<Role | null> {
    return this.repo.findOne({ where: { code } });
  }

  findAll(): Promise<Role[]> {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  create(data: Partial<Role>): Role {
    return this.repo.create(data);
  }

  save(entity: Role): Promise<Role> {
    return this.repo.save(entity);
  }
}
