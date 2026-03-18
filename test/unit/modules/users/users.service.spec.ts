import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../../src/modules/users/users.service';
import { User, UserStatus } from '../../../../src/modules/users/entities/user.entity';
import { UserRepository } from '../../../../src/modules/users/repositories/user.repository';
import { RoleRepository } from '../../../../src/modules/users/repositories/role.repository';
import { AppException } from '../../../../src/common/errors/app.exception';

const mockRole = { id: 'role-1', code: 'CUSTOMER', name: '고객' };

describe('UsersService (unit)', () => {
  let service: UsersService;
  let repo: jest.Mocked<UserRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: RoleRepository,
          useValue: {
            findByCode: jest.fn().mockResolvedValue(mockRole),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UserRepository);
  });

  describe('createUser', () => {
    it('should throw USER_EMAIL_CONFLICT when email already exists', async () => {
      (repo.findByEmail as jest.Mock).mockResolvedValue({ id: 'u1' } as User);

      await expect(
        service.createUser({ name: '홍길동', email: 'dup@example.com', password: '12345678' }),
      ).rejects.toEqual(new AppException('USER_EMAIL_CONFLICT'));
    });

    it('should hash password and save new user', async () => {
      (repo.findByEmail as jest.Mock).mockResolvedValue(null);
      (repo.create as jest.Mock).mockImplementation((data) => data);
      (repo.save as jest.Mock).mockImplementation(async (u) => ({
        ...u,
        id: 'new-id',
      }));

      const user = await service.createUser({
        name: '홍길동',
        email: 'new@example.com',
        password: '12345678',
      });

      expect(user.id).toBe('new-id');
      expect(user.email).toBe('new@example.com');
      expect(user.name).toBe('홍길동');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.roleId).toBe('role-1');
      expect(user.passwordHash).toBeDefined();
    });
  });

  describe('validatePassword', () => {
    it('should throw AUTH_INVALID_CREDENTIALS when password mismatch', async () => {
      const user = { passwordHash: await bcrypt.hash('correct', 4) } as User;

      await expect(service.validatePassword(user, 'wrong')).rejects.toEqual(
        new AppException('AUTH_INVALID_CREDENTIALS'),
      );
    });

    it('should resolve when password matches', async () => {
      const user = { passwordHash: await bcrypt.hash('correct', 4) } as User;

      await expect(service.validatePassword(user, 'correct')).resolves.toBeUndefined();
    });
  });

  describe('refresh token helpers', () => {
    it('setRefreshTokenHash should update user with hashed token', async () => {
      (repo.update as jest.Mock).mockResolvedValue(undefined);

      await service.setRefreshTokenHash('user-id', 'refresh-token');

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'user-id' },
        expect.objectContaining({ refreshTokenHash: expect.any(String) }),
      );
    });

    it('clearRefreshToken should null out refreshTokenHash', async () => {
      (repo.update as jest.Mock).mockResolvedValue(undefined);

      await service.clearRefreshToken('user-id');

      expect(repo.update).toHaveBeenCalledWith({ id: 'user-id' }, { refreshTokenHash: null });
    });

    it('verifyRefreshToken should throw AUTH_SESSION_EXPIRED when no hash stored', async () => {
      jest.spyOn(service, 'findById').mockResolvedValueOnce({
        id: 'u1',
        refreshTokenHash: null,
      } as unknown as User);

      await expect(service.verifyRefreshToken('u1', 'rt')).rejects.toEqual(
        new AppException('AUTH_SESSION_EXPIRED'),
      );
    });
  });
});

