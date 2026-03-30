import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum OutboxPublishStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  DLQ = 'DLQ',
}

@Entity({ name: 'outbox_events' })
@Index('uq_outbox_events_dedupe_key', ['dedupeKey'], { unique: true })
@Index('ix_outbox_events_publish_status_next_retry_at', ['publishStatus', 'nextRetryAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'aggregate_type' })
  aggregateType!: string;

  @Column({ type: 'varchar', length: 64, name: 'aggregate_id' })
  aggregateId!: string;

  @Column({ type: 'varchar', length: 64, name: 'event_type' })
  eventType!: string;

  @Column({ type: 'varchar', length: 128, name: 'dedupe_key' })
  dedupeKey!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 16, name: 'publish_status', default: OutboxPublishStatus.PENDING })
  publishStatus!: OutboxPublishStatus;

  @Column({ type: 'int', name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamptz', name: 'next_retry_at', nullable: true })
  nextRetryAt!: Date | null;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  @Column({ type: 'timestamptz', name: 'published_at', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt!: Date;
}
