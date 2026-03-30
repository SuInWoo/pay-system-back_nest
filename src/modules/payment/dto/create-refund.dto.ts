import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ description: '환불 금액 (원)', minimum: 1, example: 3000 })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({ description: '멱등 키', example: 'refund-550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;

  @ApiPropertyOptional({ description: '환불 사유', example: '고객 단순 변심' })
  @IsString()
  @MaxLength(255)
  reason?: string;
}
