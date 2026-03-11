import { ApiProperty } from '@nestjs/swagger';
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
}
