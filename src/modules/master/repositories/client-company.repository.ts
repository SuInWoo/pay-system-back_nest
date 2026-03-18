import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientCompany } from '../entities/client-company.entity';

@Injectable()
export class ClientCompanyRepository {
  constructor(
    @InjectRepository(ClientCompany)
    private readonly repo: Repository<ClientCompany>,
  ) {}

  findByCodeOrName(code: string, name: string): Promise<ClientCompany | null> {
    return this.repo.findOne({
      where: [{ code }, { name }],
    });
  }

  findById(id: string): Promise<ClientCompany | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAllOrderByCreatedDesc(): Promise<ClientCompany[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  create(data: Partial<ClientCompany>): ClientCompany {
    return this.repo.create(data);
  }

  save(entity: ClientCompany): Promise<ClientCompany> {
    return this.repo.save(entity);
  }
}
