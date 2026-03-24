import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertUserProfileDto {
  @ApiPropertyOptional({ description: '연락처', maxLength: 32, example: '01012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ description: '개인 이메일', maxLength: 320, example: 'me@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ description: '실명', maxLength: 120, example: '홍길동' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;
}
