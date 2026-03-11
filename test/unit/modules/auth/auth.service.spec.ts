import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../../src/common/errors/app.exception';

describe('AuthService (unit)', () => {
  let service: AuthService;
  const usersService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
    setRefreshTokenHash: jest.fn(),
    clearRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return undefined;
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw AUTH_INVALID_CREDENTIALS when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'none@example.com', password: 'pw' }),
      ).rejects.toEqual(new AppException('AUTH_INVALID_CREDENTIALS'));
    });

    it('should call validatePassword and issue tokens on success', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'u@example.com' });
      usersService.validatePassword.mockResolvedValue(undefined);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({ email: 'u@example.com', password: 'pw' });

      expect(usersService.validatePassword).toHaveBeenCalled();
      expect(usersService.setRefreshTokenHash).toHaveBeenCalledWith('u1', 'refresh-token');
      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
    });
  });

  describe('logout', () => {
    it('should delegate to usersService.clearRefreshToken', async () => {
      usersService.clearRefreshToken.mockResolvedValue(undefined);

      const res = await service.logout('u1');
      expect(usersService.clearRefreshToken).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ ok: true });
    });
  });

  describe('refresh', () => {
    it('should throw AUTH_UNAUTHORIZED when user not found', async () => {
      usersService.verifyRefreshToken.mockResolvedValue(undefined);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('u1', 'rt')).rejects.toEqual(
        new AppException('AUTH_UNAUTHORIZED'),
      );
    });
  });
});

