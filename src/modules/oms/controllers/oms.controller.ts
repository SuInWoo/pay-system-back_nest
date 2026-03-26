import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';
import { CreateOrderResponseDto } from '../dto/create-order-response.dto';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OmsService } from '../services/oms.service';

type AuthedRequest = Request & {
  user?: {
    userId: string;
    role: string;
    clientCompanyId?: string;
  };
};

@ApiTags('주문 (OMS)')
@Controller('orders')
export class OmsController {
  constructor(private readonly omsService: OmsService) {}

  private getAuthed(req: AuthedRequest): {
    userId: string;
    role: string;
    clientCompanyId?: string;
  } {
    return req.user as { userId: string; role: string; clientCompanyId?: string };
  }

  private typeGuard(req: AuthedRequest): asserts req is Required<AuthedRequest> {
    if (!req.user) {
      throw new Error('Authenticated user context is missing');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: '주문 목록 조회' })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'scope', required: false, enum: ['my', 'company', 'all'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'order_id', required: false, example: 'ORD-20260326-000123' })
  @ApiQuery({ name: 'keyword', required: false, example: '홍길동' })
  @ApiResponse({ status: 200, description: '주문 목록 (items + meta)' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN_SCOPE' })
  listOrders(@Req() req: AuthedRequest, @Query() query: ListOrdersQueryDto) {
    this.typeGuard(req);
    const auth = this.getAuthed(req);
    return this.omsService.listOrdersForScope({
      userId: auth.userId,
      role: auth.role,
      clientCompanyId: auth.clientCompanyId,
      page: query.page,
      limit: query.limit,
      scope: query.scope,
      orderId: query.order_id,
      keyword: query.keyword,
    });
  }

  @Post()
  @ApiOperation({ summary: '주문 생성 (고객사별 분할 지원)' })
  @ApiResponse({
    status: 201,
    description: '생성된 주문 묶음 (order_group_id + orders[])',
    type: CreateOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  @ApiResponse({ status: 404, description: 'PRODUCT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ORDER_ALREADY_EXISTS' })
  createOrder(@Body() dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '주문 상세 라인 추가' })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({ status: 201, description: '추가된 상세 라인 목록' })
  @ApiResponse({ status: 404, description: 'ORDER_NOT_FOUND / PRODUCT_NOT_FOUND' })
  addOrderDetails(
    @Req() req: AuthedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderDetailDto,
  ) {
    this.typeGuard(req);
    return this.omsService.addOrderDetails(orderId, dto, req.user.userId);
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
