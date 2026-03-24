import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserAddressDto {
  @ApiPropertyOptional({ description: '수령인명', maxLength: 120, example: '홍길동' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  receiver_name?: string;

  @ApiPropertyOptional({ description: '연락처', maxLength: 32, example: '01012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: '우편번호', maxLength: 16, example: '06236' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  zip_code?: string | null;

  @ApiPropertyOptional({ description: '기본 주소', maxLength: 255, example: '서울시 강남구 ...' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address1?: string;

  @ApiPropertyOptional({ description: '상세 주소', maxLength: 255, example: '101동 1203호' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address2?: string | null;

  @ApiPropertyOptional({ description: '배송지 라벨', maxLength: 120, example: '회사' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ description: '기본 배송지 여부' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
