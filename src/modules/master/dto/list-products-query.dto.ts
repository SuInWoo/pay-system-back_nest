import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ProductCategory } from '../entities/product.entity';

export class ListProductsQueryDto {
  @ApiPropertyOptional({ description: '고객사 UUID로 필터' })
  @IsOptional()
  @IsUUID()
  client_company_id?: string;

  @ApiPropertyOptional({ description: '카테고리 필터', enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @ApiPropertyOptional({ description: '페이지 번호(1부터)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기(기본 20, 최대 100)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
