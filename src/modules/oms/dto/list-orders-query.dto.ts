import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호(1부터)', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기(기본 20, 최대 100)', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '조회 범위(my|company|all)',
    enum: ['my', 'company', 'all'],
    default: 'my',
  })
  @IsOptional()
  @IsIn(['my', 'company', 'all'])
  scope?: 'my' | 'company' | 'all';

  @ApiPropertyOptional({ description: '주문 ID 단건 필터', example: 'ORD-20260326-000123' })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({
    description: '검색어 (주문자명/이메일/주문ID)',
    example: '홍길동',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
