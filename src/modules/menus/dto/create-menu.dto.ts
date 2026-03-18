import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ description: '메뉴 코드', example: 'dashboard' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiPropertyOptional({ description: '경로', default: '' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  path?: string;

  @ApiProperty({ description: '라벨', example: '대시보드' })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({ description: '아이콘' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @ApiPropertyOptional({ description: '부모 메뉴 ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
