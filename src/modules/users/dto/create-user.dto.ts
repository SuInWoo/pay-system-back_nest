import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '이름', maxLength: 120, example: '홍길동' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: '이메일', maxLength: 320, example: 'user@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ description: '비밀번호 (8자 이상)', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

