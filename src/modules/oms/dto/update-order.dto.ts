import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeliveryStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: '배송 주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '주문자 이름', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderer_name?: string;

  @ApiPropertyOptional({ description: '주문자 연락처', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  orderer_phone?: string;

  @ApiPropertyOptional({ description: '주문자 이메일', maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  orderer_email?: string;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    description: '배송 상태 (WAITING | SHIPPING | DELIVERED)',
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  delivery_status?: DeliveryStatus;
}
