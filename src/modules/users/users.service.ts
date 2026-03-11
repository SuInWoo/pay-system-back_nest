import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new AppException('USER_EMAIL_CONFLICT');

    // 비밀번호/토큰은 평문 저장 금지: DB 유출 시 2차 피해를 줄이기 위해 bcrypt 해시만 저장합니다.
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      status: UserStatus.ACTIVE,
      refreshTokenHash: null,
    });

    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async validatePassword(user: User, password: string): Promise<void> {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppException('AUTH_INVALID_CREDENTIALS');
  }

  async setRefreshTokenHash(userId: string, refreshToken: string): Promise<void> {
    // refresh token도 평문 저장 금지(로그/DB 노출 방지). 해시로만 보관하고, 비교는 bcrypt.compare로 수행합니다.
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.userRepo.update({ id: userId }, { refreshTokenHash });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    // 로그아웃(또는 강제 만료)은 서버 저장값을 제거해서 refresh를 무효화합니다.
    await this.userRepo.update({ id: userId }, { refreshTokenHash: null });
  }

  async verifyRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user?.refreshTokenHash) throw new AppException('AUTH_SESSION_EXPIRED');

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new AppException('AUTH_SESSION_EXPIRED');
  }
}

