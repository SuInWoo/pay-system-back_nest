import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OutboxOpsService } from '../services/outbox-ops.service';

@ApiTags('Outbox 운영')
@Controller('internal')
export class OutboxOpsController {
  constructor(private readonly outboxOpsService: OutboxOpsService) {}

  @Post('outbox/process')
  @ApiOperation({ summary: 'PENDING outbox 이벤트 발행 처리' })
  processPending(@Query('limit') limit?: string) {
    return this.outboxOpsService.processPending(Number(limit ?? 50));
  }

  @Post('outbox/retry-failed')
  @ApiOperation({ summary: 'FAILED outbox 이벤트를 PENDING으로 재큐잉' })
  retryFailed(@Query('limit') limit?: string) {
    return this.outboxOpsService.retryFailed(Number(limit ?? 50));
  }

  @Get('outbox')
  @ApiOperation({ summary: 'FAILED outbox 이벤트 조회' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  listFailed(@Query('limit') limit?: string) {
    return this.outboxOpsService.listFailed(Number(limit ?? 100));
  }

  @Post('outbox/replay/:eventId')
  @ApiOperation({ summary: '특정 outbox 이벤트 재발행 큐 등록' })
  @ApiResponse({ status: 201, description: '큐 등록 성공' })
  replay(@Param('eventId') eventId: string) {
    return this.outboxOpsService.replayEvent(eventId);
  }

  @Get('mq/dlq')
  @ApiOperation({ summary: 'DLQ 이벤트 조회' })
  listDlq(@Query('limit') limit?: string) {
    return this.outboxOpsService.listDlq(Number(limit ?? 100));
  }

  @Post('mq/dlq/:eventId/requeue')
  @ApiOperation({ summary: 'DLQ 이벤트 재큐잉' })
  requeueDlq(@Param('eventId') eventId: string) {
    return this.outboxOpsService.requeueDlq(eventId);
  }
}
