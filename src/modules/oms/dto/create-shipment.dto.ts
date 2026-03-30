import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ShipmentItemDto {
  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateShipmentDto {
  @ApiProperty({ description: '택배사 코드/명', example: 'CJ_LOGISTICS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  carrier!: string;

  @ApiProperty({ description: '송장 번호', example: '1234-5678-9999' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  tracking_no!: string;

  @ApiProperty({ type: [ShipmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items!: ShipmentItemDto[];
}
