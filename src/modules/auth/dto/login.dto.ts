import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '이메일', maxLength: 320, example: 'user@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ description: '비밀번호', maxLength: 72 })
  @IsString()
  @MaxLength(72)
  password!: string;
}

