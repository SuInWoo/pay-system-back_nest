import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OmsService } from '../services/oms.service';

@ApiTags('주문 (OMS)')
@Controller('orders')
export class OmsController {
  constructor(private readonly omsService: OmsService) {}

  @Get()
  @ApiOperation({ summary: '주문 목록 조회' })
  @ApiQuery({ name: 'orderer_user_id', required: false, description: '주문자 UUID로 필터 (내 주문: /auth/me에서 userId 사용)' })
  @ApiResponse({ status: 200, description: '주문 목록 (상세 포함)' })
  listOrders(@Query('orderer_user_id') ordererUserId?: string) {
    return this.omsService.listOrders({ orderer_user_id: ordererUserId });
  }

  @Post()
  @ApiOperation({ summary: '주문 생성 (관리자 B2B)' })
  @ApiResponse({ status: 201, description: '생성된 주문 (상세 포함)' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  @ApiResponse({ status: 404, description: 'PRODUCT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ORDER_ALREADY_EXISTS' })
  createOrder(@Body() dto: CreateOrderDto) {
    return this.omsService.createOrder(dto);
  }

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

  @Patch(':orderId')
  @ApiOperation({ summary: '주문 수정 (관리자 B2B)' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 200, description: '수정된 주문 (상세 포함)' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND' })
  updateOrder(@Param('orderId') orderId: string, @Body() dto: UpdateOrderDto) {
    return this.omsService.updateOrder(orderId, dto);
  }
}
