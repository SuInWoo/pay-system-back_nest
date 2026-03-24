import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class UserProfileRepository {
  constructor(
    @InjectRepository(UserProfile)
    private readonly repo: Repository<UserProfile>,
  ) {}

  findByUserId(userId: string): Promise<UserProfile | null> {
    return this.repo.findOne({ where: { userId } });
  }

  create(data: Partial<UserProfile>): UserProfile {
    return this.repo.create(data);
  }

  save(entity: UserProfile): Promise<UserProfile> {
    return this.repo.save(entity);
  }
}
