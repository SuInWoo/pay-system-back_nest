import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({ description: '토스 paymentKey', example: 'pay_...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  paymentKey!: string;

  @ApiProperty({ description: '주문 ID', example: 'ORD-260324-000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  orderId!: string;

  @ApiProperty({ description: '결제 금액 (원)', minimum: 1, example: 15000 })
  @IsInt()
  @IsPositive()
  amount!: number;
}
