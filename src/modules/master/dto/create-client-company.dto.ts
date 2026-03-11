import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateClientCompanyDto {
  @ApiProperty({ description: '고객사명', minLength: 2, maxLength: 120, example: '테스트 고객사' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: '고객사 코드 (대문자/숫자/언더스코어)', minLength: 2, maxLength: 32, example: 'CLIENT_A' })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]+$/)
  code!: string;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

