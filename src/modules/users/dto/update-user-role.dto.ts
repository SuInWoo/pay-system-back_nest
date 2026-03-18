import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ROLE_CODE } from '../entities/role.entity';

const ROLE_CODES = Object.values(ROLE_CODE);

export class UpdateUserRoleDto {
  @ApiProperty({
    description: '역할 코드',
    enum: ROLE_CODE,
    example: ROLE_CODE.CLIENT_ADMIN,
  })
  @IsIn(ROLE_CODES)
  role!: string;
}
