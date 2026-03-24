import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsPositive,
  IsUUID,
  IsString,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class OrderDetailLineDto {
  @ApiProperty({ description: '고객사 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  client_company_id!: string;

  @ApiProperty({ description: '상품 SKU', maxLength: 64, example: 'SKU-001' })
  @IsString()
  @MaxLength(64)
  sku!: string;

  @ApiProperty({ description: '수량', minimum: 1, example: 2 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateOrderDetailDto {
  @ApiProperty({ type: [OrderDetailLineDto], description: '주문 상세 라인 목록 (1건 이상)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderDetailLineDto)
  items!: OrderDetailLineDto[];

  @ApiPropertyOptional({ description: '주문자 회원 UUID' })
  @IsOptional()
  @IsUUID()
  orderer_user_id?: string;

  @ApiPropertyOptional({ description: '배송 주소', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional({ description: '주문자 이름', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderer_name?: string;

  @ApiPropertyOptional({ description: '주문자 이메일', maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  orderer_email?: string;

  @ApiPropertyOptional({ description: '주문자 연락처', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  orderer_phone?: string;
}
