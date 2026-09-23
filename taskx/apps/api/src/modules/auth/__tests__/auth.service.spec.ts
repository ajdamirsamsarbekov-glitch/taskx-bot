import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-1',
    publicUsername: 'User_abc123',
    telegramId: '123456789',
    firstName: 'Test',
    lastName: 'User',
    languageCode: 'ru',
    status: 'ACTIVE',
    rating: '0',
    reviewsCount: 0,
    completedTasks: 0,
    createdTasks: 0,
    cancelledTasks: 0,
    disputeCount: 0,
    successRate: '100',
    trustScore: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    process.env.BOT_TOKEN = 'test_bot_token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findOrCreateUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTelegramWebAppData', () => {
    it('should throw error if BOT_TOKEN is not configured', () => {
      delete process.env.BOT_TOKEN;

      expect(() => service.validateTelegramWebAppData('test')).toThrow(
        'BOT_TOKEN not configured',
      );
    });

    it('should throw error if hash is invalid', () => {
      const initData =
        'user=%7B%22id%22%3A123%7D&hash=invalid_hash&auth_date=1234567890';

      expect(() => service.validateTelegramWebAppData(initData)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error if user data not found', () => {
      const initData = 'auth_date=1234567890&hash=somehash';

      expect(() => service.validateTelegramWebAppData(initData)).toThrow(
        'User data not found',
      );
    });
  });

  describe('authenticateFromTelegram', () => {
    it('should create user and return token', async () => {
      const mockInitData =
        'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C%22language_code%22%3A%22ru%22%7D&hash=valid_hash&auth_date=1234567890';

      jest
        .spyOn(service, 'validateTelegramWebAppData')
        .mockReturnValue({
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          language_code: 'ru',
        });

      jest.spyOn(userService, 'findOrCreateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('test_jwt_token');

      const result = await service.authenticateFromTelegram(mockInitData);

      expect(result.token).toBe('test_jwt_token');
      expect(result.user).toEqual(mockUser);
      expect(userService.findOrCreateUser).toHaveBeenCalledWith({
        telegramId: '123456789',
        firstName: 'Test',
        lastName: 'User',
        languageCode: 'ru',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        telegramId: '123456789',
      });
    });
  });

  describe('validateToken', () => {
    it('should return payload if token is valid', async () => {
      const mockPayload = { sub: 'user-1', telegramId: '123456789' };
      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);

      const result = await service.validateToken('valid_token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
