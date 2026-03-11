import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AppException } from '../../common/errors/app.exception';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);
    // 회원가입 직후 바로 인증 가능한 형태로 토큰을 발급합니다.
    const tokens = await this.issueTokens({ userId: user.id, email: user.email });
    await this.usersService.setRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(params.email);
    if (!user) throw new AppException('AUTH_INVALID_CREDENTIALS');

    await this.usersService.validatePassword(user, params.password);

    // 로그인 시 refresh 토큰을 새로 발급/저장하여 기존 세션을 교체합니다(단일 디바이스 세션에 가까운 정책).
    const tokens = await this.issueTokens({ userId: user.id, email: user.email });
    await this.usersService.setRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshToken(userId);
    return { ok: true };
  }

  async refresh(userId: string, refreshToken: string) {
    // refresh는 "서버 저장값(해시)과 일치"해야만 통과합니다(탈취 토큰 재사용 방지).
    await this.usersService.verifyRefreshToken(userId, refreshToken);
    const user = await this.usersService.findById(userId);
    if (!user) throw new AppException('AUTH_UNAUTHORIZED');

    // refresh 성공 시 토큰을 재발급하고, refresh 토큰도 회전(rotate)시킵니다.
    const tokens = await this.issueTokens({ userId: user.id, email: user.email });
    await this.usersService.setRefreshTokenHash(user.id, tokens.refresh_token);
    return tokens;
  }

  private async issueTokens(params: { userId: string; email: string }): Promise<Tokens> {
    // 설정은 string("15m")/number 모두 허용하도록 타입을 맞춥니다.
    type ExpiresIn = number | StringValue;
    const accessExpiresIn =
      (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as ExpiresIn;
    const refreshExpiresIn =
      (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as ExpiresIn;

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';

    const access_token = await this.jwt.signAsync(
      { sub: params.userId, email: params.email },
      { secret: accessSecret, expiresIn: accessExpiresIn },
    );

    const refresh_token = await this.jwt.signAsync(
      { sub: params.userId, email: params.email },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: this.parseExpiresToSeconds(String(accessExpiresIn)),
    };
  }

  private parseExpiresToSeconds(v: string): number {
    // 응답(expires_in)을 숫자로 내려주기 위한 최소 파서입니다(표준 ms 포맷 일부만 지원).
    const asNumber = Number(v);
    if (Number.isFinite(asNumber)) return asNumber;

    const m = v.match(/^(\d+)([smhd])$/);
    if (!m) return 0;
    const n = Number(m[1]);
    const unit = m[2];
    if (unit === 's') return n;
    if (unit === 'm') return n * 60;
    if (unit === 'h') return n * 60 * 60;
    return n * 60 * 60 * 24;
  }
}

