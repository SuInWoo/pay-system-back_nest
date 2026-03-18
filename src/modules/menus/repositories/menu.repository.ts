import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from '../entities/menu.entity';

@Injectable()
export class MenuRepository {
  constructor(
    @InjectRepository(Menu)
    private readonly repo: Repository<Menu>,
  ) {}

  findById(id: string): Promise<Menu | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Menu | null> {
    return this.repo.findOne({ where: { code } });
  }

  findAll(options?: { activeOnly?: boolean }): Promise<Menu[]> {
    const where = options?.activeOnly ? { isActive: true } : {};
    return this.repo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  create(data: Partial<Menu>): Menu {
    return this.repo.create(data);
  }

  save(entity: Menu): Promise<Menu> {
    return this.repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
