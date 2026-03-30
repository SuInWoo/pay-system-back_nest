import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvent, OutboxPublishStatus } from '../entities/outbox-event.entity';

@Injectable()
export class OutboxEventRepository {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repo: Repository<OutboxEvent>,
  ) {}

  create(data: Partial<OutboxEvent>): OutboxEvent {
    return this.repo.create(data);
  }

  save(entity: OutboxEvent): Promise<OutboxEvent> {
    return this.repo.save(entity);
  }

  findById(id: string): Promise<OutboxEvent | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByStatus(status: OutboxPublishStatus, limit = 100): Promise<OutboxEvent[]> {
    return this.repo.find({
      where: { publishStatus: status },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    partial: Partial<Pick<OutboxEvent, 'publishStatus' | 'retryCount' | 'lastError' | 'publishedAt' | 'nextRetryAt'>>,
  ): Promise<void> {
    await this.repo.update({ id }, partial);
  }
}
