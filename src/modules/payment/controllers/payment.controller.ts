import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { PreparePaymentDto } from '../dto/prepare-payment.dto';
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

  @Post('prepare')
  @ApiOperation({ summary: '토스 결제 준비' })
  @ApiResponse({ status: 201, description: '결제 준비 정보' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_IDEMPOTENCY_CONFLICT' })
  @ApiResponse({ status: 422, description: 'PAYMENT_AMOUNT_MISMATCH' })
  prepare(@Body() dto: PreparePaymentDto) {
    return this.paymentService.preparePayment(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: '토스 결제 승인(confirm)' })
  @ApiResponse({ status: 201, description: '승인된 결제 정보' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_ALREADY_CONFIRMED' })
  @ApiResponse({ status: 422, description: 'PAYMENT_AMOUNT_MISMATCH' })
  @ApiResponse({ status: 502, description: 'PAYMENT_PROVIDER_FAILED' })
  confirm(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }

  @Get(':orderId')
  @ApiOperation({ summary: '주문별 결제 상태 조회' })
  @ApiResponse({ status: 200, description: '결제 상태' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND' })
  getByOrderId(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentByOrderId(orderId);
  }

  @Post('webhook/toss')
  @ApiOperation({ summary: '토스 웹훅 수신(초안)' })
  @ApiResponse({ status: 201, description: '수신 성공' })
  webhook(@Body() payload: Record<string, unknown>) {
    return this.paymentService.handleTossWebhook(payload);
  }

  @Post(':paymentId/refunds')
  @ApiOperation({ summary: '환불 생성 (부분/전체)' })
  @ApiResponse({ status: 201, description: '생성된 환불' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PAYMENT_NOT_REFUNDABLE' })
  @ApiResponse({ status: 422, description: 'OMS_REFUND_AMOUNT_EXCEEDED' })
  createRefund(@Param('paymentId') paymentId: string, @Body() dto: CreateRefundDto) {
    return this.paymentService.createRefund(paymentId, dto);
  }
}

