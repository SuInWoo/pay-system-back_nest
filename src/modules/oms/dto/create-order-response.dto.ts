import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderLineResponseDto {
  @ApiProperty({ example: 1 })
  line_seq!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  client_company_id!: string;

  @ApiProperty({ example: 'SKU-001' })
  sku!: string;

  @ApiProperty({ example: '상품A' })
  product_name!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 6000 })
  unit_price!: number;

  @ApiProperty({ example: 12000 })
  line_amount!: number;
}

export class CreatedOrderResponseDto {
  @ApiProperty({ example: 'ORD-20260326-000123-01' })
  order_id!: string;

  @ApiProperty({ example: 'WAITING' })
  delivery_status!: string;

  @ApiProperty({ example: '서울시 ...' })
  address!: string;

  @ApiProperty({ example: 2 })
  total_quantity!: number;

  @ApiProperty({ example: 12000 })
  total_amount!: number;

  @ApiPropertyOptional({ example: 'user-uuid' })
  orderer_user_id?: string;

  @ApiPropertyOptional({ example: '홍길동' })
  orderer_name?: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  orderer_phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  orderer_email?: string;

  @ApiProperty({ type: [OrderLineResponseDto] })
  details!: OrderLineResponseDto[];
}

export class CreateOrderResponseDto {
  @ApiProperty({ example: 'ORD-20260326-000123' })
  order_group_id!: string;

  @ApiProperty({ example: 45000 })
  total_amount!: number;

  @ApiProperty({ example: 5 })
  total_quantity!: number;

  @ApiProperty({ type: [CreatedOrderResponseDto] })
  orders!: CreatedOrderResponseDto[];
}
