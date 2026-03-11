import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentService } from '../services/payment.service';

@ApiTags('결제 (Payment)')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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

