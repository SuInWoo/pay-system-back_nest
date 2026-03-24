import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../common/errors/app.exception';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto';
import { UserAddress } from './entities/user-address.entity';
import { UserProfile } from './entities/user-profile.entity';
import { ROLE_CODE, RoleCode } from './entities/role.entity';
import { User, UserStatus } from './entities/user.entity';
import { UserAddressRepository } from './repositories/user-address.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly userProfileRepo: UserProfileRepository,
    private readonly userAddressRepo: UserAddressRepository,
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
      clientCompanyId: null,
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

  async getMyProfile(userId: string) {
    await this.ensureUserExists(userId);
    const profile = await this.userProfileRepo.findByUserId(userId);
    if (!profile) return null;
    return this.toProfile(profile);
  }

  async upsertMyProfile(userId: string, dto: UpsertUserProfileDto) {
    await this.ensureUserExists(userId);
    const existing = await this.userProfileRepo.findByUserId(userId);
    const entity = existing ?? this.userProfileRepo.create({ userId });
    if (dto.phone !== undefined) entity.phone = dto.phone ?? null;
    if (dto.email !== undefined) entity.email = dto.email ?? null;
    if (dto.name !== undefined) entity.name = dto.name ?? null;
    const saved = await this.userProfileRepo.save(entity);
    return this.toProfile(saved);
  }

  async listMyAddresses(userId: string) {
    await this.ensureUserExists(userId);
    const rows = await this.userAddressRepo.findAllByUserId(userId);
    return rows.map((row) => this.toAddress(row));
  }

  async createMyAddress(userId: string, dto: CreateUserAddressDto) {
    await this.ensureUserExists(userId);
    if (dto.is_default) {
      await this.userAddressRepo.clearDefaultByUserId(userId);
    }
    const entity = this.userAddressRepo.create({
      userId,
      receiverName: dto.receiver_name,
      phone: dto.phone,
      zipCode: dto.zip_code ?? null,
      address1: dto.address1,
      address2: dto.address2 ?? null,
      label: dto.label ?? '기본 배송지',
      isDefault: dto.is_default ?? false,
    });
    const saved = await this.userAddressRepo.save(entity);
    return this.toAddress(saved);
  }

  async updateMyAddress(userId: string, addressId: string, dto: UpdateUserAddressDto) {
    await this.ensureUserExists(userId);
    const address = await this.userAddressRepo.findByIdAndUserId(addressId, userId);
    if (!address) throw new AppException('USER_ADDRESS_NOT_FOUND');
    if (dto.is_default === true) {
      await this.userAddressRepo.clearDefaultByUserId(userId);
      address.isDefault = true;
    } else if (dto.is_default === false) {
      address.isDefault = false;
    }
    if (dto.receiver_name !== undefined) address.receiverName = dto.receiver_name;
    if (dto.phone !== undefined) address.phone = dto.phone;
    if (dto.zip_code !== undefined) address.zipCode = dto.zip_code ?? null;
    if (dto.address1 !== undefined) address.address1 = dto.address1;
    if (dto.address2 !== undefined) address.address2 = dto.address2 ?? null;
    if (dto.label !== undefined) address.label = dto.label;
    const saved = await this.userAddressRepo.save(address);
    return this.toAddress(saved);
  }

  async setDefaultMyAddress(userId: string, addressId: string) {
    await this.ensureUserExists(userId);
    const address = await this.userAddressRepo.findByIdAndUserId(addressId, userId);
    if (!address) throw new AppException('USER_ADDRESS_NOT_FOUND');
    await this.userAddressRepo.clearDefaultByUserId(userId);
    address.isDefault = true;
    const saved = await this.userAddressRepo.save(address);
    return this.toAddress(saved);
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppException('USER_NOT_FOUND');
  }

  private toProfile(profile: UserProfile) {
    return {
      user_id: profile.userId,
      phone: profile.phone,
      email: profile.email,
      name: profile.name,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  private toAddress(address: UserAddress) {
    return {
      id: address.id,
      user_id: address.userId,
      receiver_name: address.receiverName,
      phone: address.phone,
      zip_code: address.zipCode,
      address1: address.address1,
      address2: address.address2,
      label: address.label,
      is_default: address.isDefault,
      created_at: address.createdAt,
      updated_at: address.updatedAt,
    };
  }
}

