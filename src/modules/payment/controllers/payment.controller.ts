import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentService } from '../services/payment.service';

@ApiTags('결제 (Payment)')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({ summary: '결제 목록 조회 (관리자)' })
  @ApiQuery({ name: 'order_id', required: false, description: '주문 ID로 필터' })
  @ApiResponse({ status: 200, description: '결제 목록' })
  listPayments(@Query('order_id') orderId?: string) {
    return this.paymentService.listPayments({ order_id: orderId });
  }

  @Post()
  @ApiOperation({ summary: '결제 생성 (멱등 키 필수)' })
  @ApiResponse({ status: 201, description: '생성된 결제' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  @ApiResponse({ status: 409, description: '동일 idempotency_key 중복 등' })
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment({
      orderId: dto.order_id,
      amount: dto.amount,
      idempotencyKey: dto.idempotency_key,
    });
  }
}

