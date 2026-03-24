import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ProductCategory } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ description: '고객사 UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  client_company_id!: string;

  @ApiProperty({ description: '상품 SKU', maxLength: 64, example: 'SKU-001' })
  @IsString()
  @MaxLength(64)
  sku!: string;

  @ApiProperty({ description: '상품명', maxLength: 200, example: '상품 A' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: '상품 카테고리',
    enum: ProductCategory,
    example: ProductCategory.APPAREL,
  })
  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @ApiProperty({ description: '가격 (원)', minimum: 0, example: 10000 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

