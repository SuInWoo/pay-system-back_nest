import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  refresh_token!: string;
}

