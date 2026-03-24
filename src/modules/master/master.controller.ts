import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto, PRODUCT_SORT_BY, PRODUCT_SORT_ORDER } from './dto/list-products-query.dto';
import { ProductCategory } from './entities/product.entity';
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

  @Get('product-categories')
  @ApiOperation({ summary: '상품 카테고리 목록 조회' })
  @ApiResponse({ status: 200, description: '카테고리 목록(items)' })
  listProductCategories() {
    return this.masterService.listProductCategories();
  }

  @Get('products')
  @ApiOperation({ summary: '상품 목록 조회' })
  @ApiQuery({ name: 'client_company_id', required: false, description: '고객사 UUID로 필터' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '카테고리 필터(단일/복수: APPAREL,FOOD)',
    example: 'APPAREL,FOOD',
  })
  @ApiQuery({ name: 'page', required: false, description: '페이지 번호(1부터)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '페이지 크기(기본 20, 최대 100)', example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, enum: PRODUCT_SORT_BY, description: '정렬 컬럼(기본 created_at)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: PRODUCT_SORT_ORDER, description: '정렬 방향(기본 desc)' })
  @ApiResponse({ status: 200, description: '상품 목록 페이지네이션 결과(items + meta)' })
  listProducts(@Query() query: ListProductsQueryDto) {
    return this.masterService.listProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: '상품 단건 조회' })
  @ApiResponse({ status: 200, description: '상품 상세' })
  @ApiResponse({ status: 404, description: 'PRODUCT_NOT_FOUND' })
  getProduct(@Param('id') id: string) {
    return this.masterService.getProduct(id);
  }
}

