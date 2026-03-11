import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppException } from '../../../../src/common/errors/app.exception';
import { User, UserStatus } from '../../../../src/modules/users/entities/user.entity';
import { UsersService } from '../../../../src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'a@b.com',
    passwordHash: 'hashed',
    status: UserStatus.ACTIVE,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((attrs) => ({ ...attrs })),
      save: jest.fn((u) => Promise.resolve({ ...u, id: mockUser.id })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('이메일 중복이면 USER_EMAIL_CONFLICT 예외', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.createUser({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(AppException);
      await expect(
        service.createUser({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'USER_EMAIL_CONFLICT' });
    });

    it('정상 시 사용자 생성 후 반환', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const out = await service.createUser({
        email: 'new@b.com',
        password: 'password123',
      });
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@b.com',
          passwordHash: 'hashed',
          status: UserStatus.ACTIVE,
          refreshTokenHash: null,
        }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(out.email).toBe('new@b.com');
    });
  });

  describe('validatePassword', () => {
    it('비밀번호 불일치 시 AUTH_INVALID_CREDENTIALS', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);
      await expect(
        service.validatePassword(mockUser, 'wrong'),
      ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    });

    it('비밀번호 일치 시 예외 없음', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      await expect(
        service.validatePassword(mockUser, 'correct'),
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('유저 없거나 refreshTokenHash 없으면 AUTH_SESSION_EXPIRED', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.verifyRefreshToken('user-1', 'token'),
      ).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });

      userRepo.findOne.mockResolvedValue({ ...mockUser, refreshTokenHash: null });
      await expect(
        service.verifyRefreshToken('user-1', 'token'),
      ).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    });

    it('토큰 불일치 시 AUTH_SESSION_EXPIRED', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'storedHash',
      });
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);
      await expect(
        service.verifyRefreshToken('user-1', 'wrong-token'),
      ).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' });
    });

    it('토큰 일치 시 예외 없음', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: 'storedHash',
      });
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);
      await expect(
        service.verifyRefreshToken('user-1', 'valid-token'),
      ).resolves.toBeUndefined();
    });
  });

  describe('clearRefreshToken', () => {
    it('해당 유저 refresh_token_hash를 null로 갱신', async () => {
      await service.clearRefreshToken('user-1');
      expect(userRepo.update).toHaveBeenCalledWith(
        { id: 'user-1' },
        { refreshTokenHash: null },
      );
    });
  });
});
