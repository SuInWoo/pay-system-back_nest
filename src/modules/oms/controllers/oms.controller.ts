import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';
import { OmsService } from '../services/oms.service';

@ApiTags('주문 (OMS)')
@Controller('orders')
export class OmsController {
  constructor(private readonly omsService: OmsService) {}

  @Get(':orderId')
  @ApiOperation({ summary: '주문 조회 (상세 포함)' })
  @ApiParam({ name: 'orderId', description: '주문 ID', example: 'ORD-20250311-000001' })
  @ApiResponse({ status: 200, description: '주문 + 상세 라인' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND' })
  getOrderWithDetails(@Param('orderId') orderId: string) {
    return this.omsService.getOrderWithDetails(orderId);
  }

  @Post(':orderId/details')
  @ApiOperation({ summary: '주문 상세 라인 추가' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 201, description: '추가된 상세 라인 목록' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND / PRODUCT_NOT_FOUND' })
  addOrderDetails(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderDetailDto,
  ) {
    return this.omsService.addOrderDetails(orderId, dto);
  }
}
