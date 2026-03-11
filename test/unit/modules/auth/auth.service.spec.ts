import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '../../../../src/common/errors/app.exception';
import { User } from '../../../../src/modules/users/entities/user.entity';
import { UsersService } from '../../../../src/modules/users/users.service';
import { AuthService } from '../../../../src/modules/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'createUser' | 'findByEmail' | 'validatePassword' | 'setRefreshTokenHash' | 'clearRefreshToken' | 'verifyRefreshToken' | 'findById'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const mockUser: User = {
    id: 'user-1',
    email: 'a@b.com',
    passwordHash: 'hash',
    status: 'ACTIVE' as any,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      createUser: jest.fn().mockResolvedValue(mockUser),
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockUser),
      validatePassword: jest.fn().mockResolvedValue(undefined),
      setRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
      clearRefreshToken: jest.fn().mockResolvedValue(undefined),
      verifyRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest.fn().mockImplementation((payload, opts) => {
        return Promise.resolve(`jwt-${opts?.secret === 'refresh' ? 'refresh' : 'access'}`);
      }),
    };
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('createUser 호출 후 토큰 발급 및 setRefreshTokenHash 호출', async () => {
      const dto = { email: 'new@b.com', password: 'pass1234' };
      const out = await service.register(dto);
      expect(usersService.createUser).toHaveBeenCalledWith(dto);
      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
      expect(out.user).toEqual({ id: mockUser.id, email: mockUser.email });
      expect(out.access_token).toBeDefined();
      expect(out.refresh_token).toBeDefined();
      expect(out.token_type).toBe('Bearer');
    });
  });

  describe('login', () => {
    it('유저 없으면 AUTH_INVALID_CREDENTIALS', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'a@b.com', password: 'pass' }),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });

    it('validatePassword 실패 시 AUTH_INVALID_CREDENTIALS', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockRejectedValue(
        new AppException('AUTH_INVALID_CREDENTIALS'),
      );
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });

    it('정상 시 토큰 발급 및 setRefreshTokenHash 호출', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      const out = await service.login({
        email: 'a@b.com',
        password: 'correct',
      });
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        mockUser,
        'correct',
      );
      expect(usersService.setRefreshTokenHash).toHaveBeenCalled();
      expect(out.user.email).toBe('a@b.com');
      expect(out.access_token).toBeDefined();
    });
  });

  describe('logout', () => {
    it('clearRefreshToken 호출 후 { ok: true } 반환', async () => {
      const out = await service.logout('user-1');
      expect(usersService.clearRefreshToken).toHaveBeenCalledWith('user-1');
      expect(out).toEqual({ ok: true });
    });
  });

  describe('refresh', () => {
    it('verifyRefreshToken 실패 시 예외 전파', async () => {
      usersService.verifyRefreshToken.mockRejectedValue(
        new AppException('AUTH_SESSION_EXPIRED'),
      );
      await expect(
        service.refresh('user-1', 'refresh-token'),
      ).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    });

    it('findById 없으면 AUTH_UNAUTHORIZED', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(
        service.refresh('user-1', 'refresh-token'),
      ).rejects.toMatchObject({ code: 'AUTH_UNAUTHORIZED' });
    });

    it('정상 시 토큰 재발급 및 setRefreshTokenHash 호출', async () => {
      const out = await service.refresh('user-1', 'valid-refresh');
      expect(usersService.verifyRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'valid-refresh',
      );
      expect(usersService.setRefreshTokenHash).toHaveBeenCalled();
      expect(out.access_token).toBeDefined();
      expect(out.refresh_token).toBeDefined();
    });
  });
});
