import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/errors/app.exception';
import { CreateUserDto } from './dto/create-user.dto';
import { ROLE_CODE, RoleCode } from './entities/role.entity';
import { User, UserStatus } from './entities/user.entity';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async createUser(dto: CreateUserDto, roleCode: keyof typeof ROLE_CODE = 'CUSTOMER'): Promise<User> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppException('USER_EMAIL_CONFLICT');

    const role = await this.roleRepo.findByCode(ROLE_CODE[roleCode]);
    if (!role) throw new AppException('INTERNAL_ERROR');

    // 비밀번호/토큰은 평문 저장 금지: DB 유출 시 2차 피해를 줄이기 위해 bcrypt 해시만 저장합니다.
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      roleId: role.id,
      status: UserStatus.ACTIVE,
      refreshTokenHash: null,
    });

    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async listRoles(): Promise<{ id: string; code: string; name: string; sortOrder: number }[]> {
    const roles = await this.roleRepo.findAll();
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      sortOrder: r.sortOrder,
    }));
  }

  async updateRole(userId: string, roleCode: string): Promise<{ id: string; email: string; role: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppException('USER_NOT_FOUND');

    const role = await this.roleRepo.findByCode(roleCode as RoleCode);
    if (!role) throw new AppException('VALIDATION_FAILED');

    await this.userRepo.update({ id: userId }, { roleId: role.id });
    const updated = await this.userRepo.findById(userId);
    return {
      id: updated!.id,
      email: updated!.email,
      role: updated!.role?.code ?? roleCode,
    };
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

