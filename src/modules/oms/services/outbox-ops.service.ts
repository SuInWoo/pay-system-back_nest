import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxPublishStatus } from '../entities/outbox-event.entity';
import { OutboxEventRepository } from '../repositories/outbox-event.repository';

@Injectable()
export class OutboxOpsService {
  private readonly maxRetry = 3;

  constructor(private readonly outboxRepo: OutboxEventRepository) {}

  async processPending(limit = 50) {
    const rows = await this.outboxRepo.findByStatus(OutboxPublishStatus.PENDING, limit);
    let succeeded = 0;
    let failed = 0;
    let dlq = 0;

    for (const row of rows) {
      try {
        await this.publishToBus(row);
        await this.outboxRepo.updateStatus(row.id, {
          publishStatus: OutboxPublishStatus.SUCCEEDED,
          publishedAt: new Date(),
          lastError: null,
          nextRetryAt: null,
        });
        succeeded += 1;
      } catch (e: any) {
        const nextRetry = (row.retryCount ?? 0) + 1;
        const moveToDlq = nextRetry >= this.maxRetry;
        await this.outboxRepo.updateStatus(row.id, {
          publishStatus: moveToDlq ? OutboxPublishStatus.DLQ : OutboxPublishStatus.FAILED,
          retryCount: nextRetry,
          lastError: String(e?.message ?? 'publish failed'),
          nextRetryAt: moveToDlq ? null : new Date(Date.now() + nextRetry * 60_000),
        });
        if (moveToDlq) dlq += 1;
        else failed += 1;
      }
    }

    return { total: rows.length, succeeded, failed, dlq };
  }

  async retryFailed(limit = 50) {
    const rows = await this.outboxRepo.findByStatus(OutboxPublishStatus.FAILED, limit);
    for (const row of rows) {
      await this.outboxRepo.updateStatus(row.id, {
        publishStatus: OutboxPublishStatus.PENDING,
        lastError: null,
      });
    }
    return { moved: rows.length };
  }

  listFailed(limit = 100) {
    return this.outboxRepo.findByStatus(OutboxPublishStatus.FAILED, limit);
  }

  listDlq(limit = 100) {
    return this.outboxRepo.findByStatus(OutboxPublishStatus.DLQ, limit);
  }

  async replayEvent(id: string) {
    const row = await this.outboxRepo.findById(id);
    if (!row) return null;
    await this.outboxRepo.updateStatus(id, {
      publishStatus: OutboxPublishStatus.PENDING,
      lastError: null,
      nextRetryAt: null,
    });
    return { id, status: 'QUEUED' as const };
  }

  async requeueDlq(id: string) {
    const row = await this.outboxRepo.findById(id);
    if (!row || row.publishStatus !== OutboxPublishStatus.DLQ) return null;
    await this.outboxRepo.updateStatus(id, {
      publishStatus: OutboxPublishStatus.PENDING,
      lastError: null,
      nextRetryAt: null,
    });
    return { id, status: 'QUEUED' as const };
  }

  private async publishToBus(row: OutboxEvent): Promise<void> {
    // 실제 MQ 연동 전까지는 outbox 처리 경로와 장애 시나리오를 검증하기 위해 강제 실패 플래그를 허용합니다.
    const forceFail = row.payload?.forceFail === true;
    if (forceFail) {
      throw new Error('forced publish failure');
    }
  }
}
