import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ProductCategory } from '../entities/product.entity';

export const PRODUCT_SORT_BY = ['created_at', 'price', 'name'] as const;
export type ProductSortBy = (typeof PRODUCT_SORT_BY)[number];
export const PRODUCT_SORT_ORDER = ['asc', 'desc'] as const;
export type ProductSortOrder = (typeof PRODUCT_SORT_ORDER)[number];

export class ListProductsQueryDto {
  @ApiPropertyOptional({ description: '고객사 UUID로 필터' })
  @IsOptional()
  @IsUUID()
  client_company_id?: string;

  @ApiPropertyOptional({
    description: '카테고리 필터(단일 또는 콤마 구분 복수)',
    example: 'APPAREL,FOOD',
  })
  @IsOptional()
  @IsString()
  category?: string;

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

  @ApiPropertyOptional({
    description: '정렬 컬럼 (기본: created_at)',
    enum: PRODUCT_SORT_BY,
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORT_BY)
  sortBy?: ProductSortBy;

  @ApiPropertyOptional({
    description: '정렬 방향 (기본: desc)',
    enum: PRODUCT_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORT_ORDER)
  sortOrder?: ProductSortOrder;
}
