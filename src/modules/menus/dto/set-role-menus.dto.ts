import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetRoleMenusDto {
  @ApiProperty({ description: '메뉴 ID 목록', type: [String], example: [] })
  @IsArray()
  @IsUUID('4', { each: true })
  menuIds!: string[];
}
