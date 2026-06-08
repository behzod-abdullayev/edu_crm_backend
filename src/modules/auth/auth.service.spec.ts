import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { MailService } from '../../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../../shared/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const passwordHash = bcrypt.hashSync('Password1!', 10);

const makeQb = (resolved: User | null) => ({
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(resolved),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
});

const mockUserRepo = {
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  create: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('secret'),
};

const mockEventEmitter = { emit: jest.fn() };
const mockMailService = {
  sendOtpEmail: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── validateUser ───────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns null when user not found', async () => {
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      const result = await service.validateUser('no@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('throws when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      const user = { id: 'u1', email: 'test@test.com', password: passwordHash, loginAttempts: 5, lockedUntil };
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(user as unknown as User));
      await expect(service.validateUser('test@test.com', 'Password1!')).rejects.toThrow(UnauthorizedException);
    });

    it('returns null and increments attempts on wrong password', async () => {
      const user = { id: 'u1', email: 'test@test.com', password: passwordHash, loginAttempts: 0, lockedUntil: null };
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(user as unknown as User));
      const result = await service.validateUser('test@test.com', 'WrongPass!');
      expect(result).toBeNull();
      expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ loginAttempts: 1 }));
    });

    it('locks account after 5 failed attempts', async () => {
      const user = { id: 'u1', email: 'test@test.com', password: passwordHash, loginAttempts: 4, lockedUntil: null };
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(user as unknown as User));
      await expect(service.validateUser('test@test.com', 'WrongPass!')).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ lockedUntil: expect.any(Date) }));
    });

    it('returns user and resets attempts on correct password', async () => {
      const user = { id: 'u1', email: 'test@test.com', password: passwordHash, loginAttempts: 2, lockedUntil: null };
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(user as unknown as User));
      const result = await service.validateUser('test@test.com', 'Password1!');
      expect(result).not.toBeNull();
      expect(mockUserRepo.update).toHaveBeenCalledWith('u1', expect.objectContaining({ loginAttempts: 0 }));
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException for invalid credentials', async () => {
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      await expect(service.login({ email: 'bad@test.com', password: 'Wrong1!' } as never, '127.0.0.1'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and user on success', async () => {
      const user = {
        id: 'u1', email: 'user@test.com', password: passwordHash, loginAttempts: 0,
        lockedUntil: null, status: UserStatus.ACTIVE, role: UserRole.STUDENT,
        tenantId: 't1', twoFaEnabled: false,
      };
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder
        .mockReturnValueOnce(makeQb(user as unknown as User))
        .mockReturnValue(execQb);
      const result = await service.login({ email: 'user@test.com', password: 'Password1!' } as never, '127.0.0.1');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const savedUser = { id: 'u2', email: 'new@test.com', firstName: 'New', tenantId: 't1', role: UserRole.STUDENT };
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder.mockReturnValue(execQb);

      const result = await service.register({
        firstName: 'New', lastName: 'User', email: 'new@test.com', password: 'Password1!', tenantId: 't1',
      });
      expect(result).toHaveProperty('accessToken');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.registered', expect.any(Object));
    });

    it('throws ConflictException when email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.register({
        firstName: 'A', lastName: 'B', email: 'exist@test.com', password: 'Password1!', tenantId: 't1',
      })).rejects.toThrow(ConflictException);
    });
  });

  // ─── refreshToken ────────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('throws on invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when refresh token hash does not match', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.com', role: UserRole.STUDENT, tenantId: 't1' });
      const storedHash = await bcrypt.hash('other-token', 10);
      const qb = makeQb({ id: 'u1', refreshToken: storedHash } as unknown as User);
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.refreshToken('my-token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new tokens on valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const storedHash = await bcrypt.hash(refreshToken, 10);
      mockJwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.com', role: UserRole.STUDENT, tenantId: 't1' });
      const user = { id: 'u1', email: 'a@b.com', role: UserRole.STUDENT, tenantId: 't1', refreshToken: storedHash };
      const readQb = makeQb(user as unknown as User);
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder
        .mockReturnValueOnce(readQb)
        .mockReturnValue(execQb);
      const result = await service.refreshToken(refreshToken);
      expect(result).toHaveProperty('accessToken');
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears refresh token hash', async () => {
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder.mockReturnValue(execQb);
      await service.logout('u1');
      expect(execQb.set).toHaveBeenCalledWith({ refreshToken: '' });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.logout', { userId: 'u1' });
    });
  });

  // ─── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('sends OTP email when user exists', async () => {
      const user = { id: 'u1', email: 'test@test.com', firstName: 'Test' };
      mockUserRepo.findOne.mockResolvedValue(user);
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder.mockReturnValue(execQb);
      await service.forgotPassword({ email: 'test@test.com' });
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith('test@test.com', expect.any(String), 'Test');
    });

    it('does nothing when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await service.forgotPassword({ email: 'ghost@test.com' });
      expect(mockMailService.sendOtpEmail).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid token', async () => {
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(null));
      await expect(service.resetPassword({ token: 'bad', password: 'NewPass1!' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      const user = { id: 'u1', otpCode: 'TOKEN', otpExpiresAt: new Date(Date.now() - 1000) };
      mockUserRepo.createQueryBuilder.mockReturnValue(makeQb(user as unknown as User));
      await expect(service.resetPassword({ token: 'TOKEN', password: 'NewPass1!' })).rejects.toThrow(BadRequestException);
    });

    it('updates password for valid token', async () => {
      const user = { id: 'u1', otpCode: 'TOKEN', otpExpiresAt: new Date(Date.now() + 60000) };
      const readQb = makeQb(user as unknown as User);
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder
        .mockReturnValueOnce(readQb)
        .mockReturnValue(execQb);
      await service.resetPassword({ token: 'TOKEN', password: 'NewPass1!' });
      expect(execQb.set).toHaveBeenCalledWith(expect.objectContaining({ password: expect.any(String) }));
    });
  });

  // ─── 2FA ─────────────────────────────────────────────────────────────────────

  describe('setup2FA', () => {
    it('generates secret and QR code', async () => {
      const user = { id: 'u1', email: 'user@test.com' };
      mockUserRepo.findOne.mockResolvedValue(user);
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder.mockReturnValue(execQb);
      const result = await service.setup2FA('u1');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
    });
  });

  describe('disable2FA', () => {
    it('disables 2FA', async () => {
      const execQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
      mockUserRepo.createQueryBuilder.mockReturnValue(execQb);
      await service.disable2FA('u1');
      expect(execQb.set).toHaveBeenCalledWith({ twoFaEnabled: false, twoFaSecret: '' });
    });
  });
});
