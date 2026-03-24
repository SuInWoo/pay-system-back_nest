import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateUserAddressDto } from '../users/dto/create-user-address.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserAddressDto } from '../users/dto/update-user-address.dto';
import { UpsertUserProfileDto } from '../users/dto/upsert-user-profile.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MenusService } from '../menus/menus.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';

type AuthedRequest = Request & {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
    roleName: string;
    clientCompanyId?: string;
  };
};

@ApiTags('인증 (Auth)')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly menusService: MenusService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '가입 완료' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패 / 이메일 중복 등' })
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: 'access_token, refresh_token 등' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('roles')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '역할 목록 조회' })
  @ApiResponse({ status: 200, description: 'Role[] (id, code, name, sortOrder)' })
  listRoles() {
    return this.authService.listRoles();
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 처리' })
  @ApiResponse({ status: 401, description: '미인증' })
  logout(@Req() req: AuthedRequest) {
    return this.authService.logout(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, description: 'user (userId, email, name, role, roleName, menus)' })
  @ApiResponse({ status: 401, description: '미인증' })
  async me(@Req() req: AuthedRequest) {
    const menus = await this.menusService.getMenusForRole(req.user!.role);
    return { user: { ...req.user, menus } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, description: '새 access_token 등' })
  @ApiResponse({ status: 401, description: '미인증 / 리프레시 토큰 무효' })
  refresh(@Req() req: AuthedRequest, @Body() dto: RefreshDto) {
    return this.authService.refresh(req.user!.userId, dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 개인정보 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 정보' })
  getMyProfile(@Req() req: AuthedRequest) {
    return this.usersService.getMyProfile(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 개인정보 프로필 저장/수정' })
  @ApiResponse({ status: 201, description: '저장된 프로필 정보' })
  upsertMyProfile(@Req() req: AuthedRequest, @Body() dto: UpsertUserProfileDto) {
    return this.usersService.upsertMyProfile(req.user!.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 배송지 목록 조회' })
  @ApiResponse({ status: 200, description: '배송지 목록' })
  listMyAddresses(@Req() req: AuthedRequest) {
    return this.usersService.listMyAddresses(req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 배송지 생성' })
  @ApiResponse({ status: 201, description: '생성된 배송지' })
  createMyAddress(@Req() req: AuthedRequest, @Body() dto: CreateUserAddressDto) {
    return this.usersService.createMyAddress(req.user!.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/addresses/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 배송지 수정' })
  @ApiResponse({ status: 201, description: '수정된 배송지' })
  updateMyAddress(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.usersService.updateMyAddress(req.user!.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/addresses/:id/default')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 기본 배송지 설정' })
  @ApiResponse({ status: 201, description: '기본 배송지 설정 결과' })
  setDefaultMyAddress(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.usersService.setDefaultMyAddress(req.user!.userId, id);
  }
}

