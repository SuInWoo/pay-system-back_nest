import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrderDetailLineDto } from './create-order-detail.dto';

export class CreateOrderDto {
  @ApiProperty({ description: '주문 ID', maxLength: 64, example: 'ORD-20250318-000001' })
  @IsString()
  @MaxLength(64)
  order_id!: string;

  @ApiPropertyOptional({ description: '배송 주소', default: '' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '주문자 회원 UUID' })
  @IsOptional()
  @IsUUID()
  orderer_user_id?: string;

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
    type: [OrderDetailLineDto],
    description: '주문 상세 라인 (생략 시 빈 주문으로 생성)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderDetailLineDto)
  items?: OrderDetailLineDto[];
}
