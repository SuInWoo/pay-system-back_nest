import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  save(entity: User): Promise<User> {
    return this.repo.save(entity);
  }

  update(criteria: { id: string }, partial: Partial<User>): Promise<void> {
    return this.repo.update(criteria, partial).then(() => undefined);
  }
}
