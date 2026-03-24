import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class PreparePaymentDto {
  @ApiProperty({ description: '주문 ID', example: 'ORD-260324-000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  order_id!: string;

  @ApiProperty({ description: '결제 금액 (원)', minimum: 1, example: 15000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: '멱등 키', example: 'pay-uuid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}
