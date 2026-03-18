import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { MasterService } from './master.service';

@ApiTags('마스터 (고객사·상품)')
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Post('client-companies')
  @ApiOperation({ summary: '고객사 생성' })
  @ApiResponse({ status: 201, description: '생성된 고객사' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  createClientCompany(@Body() dto: CreateClientCompanyDto) {
    return this.masterService.createClientCompany(dto);
  }

  @Get('client-companies')
  @ApiOperation({ summary: '고객사 목록 조회' })
  @ApiResponse({ status: 200, description: '고객사 목록' })
  listClientCompanies() {
    return this.masterService.listClientCompanies();
  }

  @Post('products')
  @ApiOperation({ summary: '상품 생성' })
  @ApiResponse({ status: 201, description: '생성된 상품' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.masterService.createProduct(dto);
  }

  @Get('products')
  @ApiOperation({ summary: '상품 목록 조회' })
  @ApiQuery({ name: 'client_company_id', required: false, description: '고객사 UUID로 필터' })
  @ApiResponse({ status: 200, description: '상품 목록' })
  listProducts(@Query('client_company_id') clientCompanyId?: string) {
    return this.masterService.listProducts({ client_company_id: clientCompanyId });
  }

  @Get('products/:id')
  @ApiOperation({ summary: '상품 단건 조회' })
  @ApiResponse({ status: 200, description: '상품 상세' })
  @ApiResponse({ status: 404, description: 'PRODUCT_NOT_FOUND' })
  getProduct(@Param('id') id: string) {
    return this.masterService.getProduct(id);
  }
}

