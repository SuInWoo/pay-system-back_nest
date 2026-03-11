import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: '주문 ID', example: 'ORD-20250311-000001' })
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @ApiProperty({ description: '결제 금액 (원)', minimum: 1, example: 15000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: '멱등 키 (중복 결제 방지)', example: 'pay-550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  idempotency_key!: string;
}

