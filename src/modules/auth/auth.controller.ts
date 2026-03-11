import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';

type AuthedRequest = Request & { user?: { userId: string; email: string } };

@ApiTags('인증 (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiResponse({ status: 200, description: 'user (userId, email)' })
  @ApiResponse({ status: 401, description: '미인증' })
  me(@Req() req: AuthedRequest) {
    return { user: req.user };
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
}

