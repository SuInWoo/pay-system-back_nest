import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: '경로' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  path?: string;

  @ApiPropertyOptional({ description: '라벨' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ description: '아이콘' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @ApiPropertyOptional({ description: '부모 메뉴 ID (null이면 루트로)' })
  @IsOptional()
  @ValidateIf((o) => o.parentId != null)
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
