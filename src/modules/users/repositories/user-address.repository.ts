import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from '../entities/user-address.entity';

@Injectable()
export class UserAddressRepository {
  constructor(
    @InjectRepository(UserAddress)
    private readonly repo: Repository<UserAddress>,
  ) {}

  findAllByUserId(userId: string): Promise<UserAddress[]> {
    return this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  findByIdAndUserId(id: string, userId: string): Promise<UserAddress | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async clearDefaultByUserId(userId: string): Promise<void> {
    await this.repo.update({ userId, isDefault: true }, { isDefault: false });
  }

  create(data: Partial<UserAddress>): UserAddress {
    return this.repo.create(data);
  }

  save(entity: UserAddress): Promise<UserAddress> {
    return this.repo.save(entity);
  }
}
