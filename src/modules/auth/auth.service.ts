import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

import { User } from '../users/entities/user.entity';
import { UserRole, UserStatus } from '../../shared/enums';
import { JwtPayload } from './interfaces/jwt-payload.interface';

import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyOtpDto,
} from './dto/login.dto';

import { RegisterDto } from './dto/register.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { getPermissionsForRole } from '../../common/utils/permissions.util';

import { generateOtp, generateVerificationCode } from '../../common/utils/crypto.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private mailService: MailService,
  ) {}

  // ====================== VALIDATE USER ======================
  async validateUser(email: string, password: string, tenantId?: string): Promise<User | null> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email });

    if (tenantId) qb.andWhere('u.tenantId = :tenantId', { tenantId });

    const user = await qb.getOne();
    if (!user) return null;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account is locked. Try again in ${minutesLeft} minute(s).`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const attempts = (user.loginAttempts ?? 0) + 1;

      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await this.userRepo.update(user.id, {
          loginAttempts: attempts,
          lockedUntil: lockUntil,
        });
        throw new UnauthorizedException('Account locked for 15 minutes due to too many failed attempts.');
      }

      await this.userRepo.update(user.id, { loginAttempts: attempts });
      return null;
    }

    await this.userRepo.update(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    return user;
  }

  // ====================== REGISTER ======================
  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: Partial<User> }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email, tenantId: dto.tenantId || '' },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists in this tenant');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      tenantId: dto.tenantId || '',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    const savedUser = await this.userRepo.save(user);

    this.eventEmitter.emit('user.registered', {
      userId: savedUser.id,
      email: savedUser.email,
      tenantId: savedUser.tenantId,
    });

    const tokens = await this.generateTokens(savedUser);

    const { password: _, refreshToken: __, twoFaSecret: ___, ...safeUser } = savedUser;

    return { ...tokens, user: safeUser };
  }

  // ====================== LOGIN ======================
  async login(dto: LoginDto, ip: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended');
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    if (user.twoFaEnabled) {
      if (!dto.twoFaToken) throw new UnauthorizedException('2FA token is required');

      const isValid = speakeasy.totp.verify({
        secret: user.twoFaSecret!,
        encoding: 'base32',
        token: dto.twoFaToken,
      });

      if (!isValid) throw new UnauthorizedException('Invalid 2FA token');
    }

    const tokens = await this.generateTokens(user);

    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      status: UserStatus.ACTIVE,
    });

    this.eventEmitter.emit('auth.login', { userId: user.id, ip });

    const userPayload: MeResponseDto = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      profilePictureUrl: user.avatarUrl ?? null,
      phone: user.phone ?? null,
      preferredLanguage: user.language ?? 'uz',
      twoFactorEnabled: user.twoFaEnabled ?? false,
      permissions: getPermissionsForRole(user.role),
      createdAt: user.createdAt,
    };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userPayload,
    };
  }

  // ====================== GENERATE TOKENS ======================
  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ refreshToken: hashedRefreshToken })
      .where('id = :id', { id: user.id })
      .execute();

    return { accessToken, refreshToken };
  }

  // ====================== REFRESH TOKEN ======================
  async refreshToken(token: string): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo
        .createQueryBuilder('user')
        .addSelect('user.refreshToken')
        .where('user.id = :id', { id: payload.sub })
        .getOne();

      if (!user?.refreshToken) throw new UnauthorizedException('Invalid refresh token');

      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) throw new UnauthorizedException('Invalid refresh token');

      const tokens = await this.generateTokens(user);

      const userPayload: MeResponseDto = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        profilePictureUrl: user.avatarUrl ?? null,
        phone: user.phone ?? null,
        preferredLanguage: user.language ?? 'uz',
        twoFactorEnabled: user.twoFaEnabled ?? false,
        permissions: getPermissionsForRole(user.role),
        createdAt: user.createdAt,
      };

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userPayload,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ====================== LOGOUT ======================
  async logout(userId: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ refreshToken: '' })
      .where('id = :id', { id: userId })
      .execute();

    this.eventEmitter.emit('auth.logout', { userId });
  }

  // ====================== PASSWORD RESET ======================
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) return;

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ otpCode: otp, otpExpiresAt })
      .where('id = :id', { id: user.id })
      .execute();

    await this.mailService.sendOtpEmail(user.email, otp, user.firstName);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect(['user.otpCode', 'user.otpExpiresAt'])
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user || !user.otpCode || user.otpCode !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    const resetToken = generateVerificationCode();
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ otpCode: resetToken, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) })
      .where('id = :id', { id: user.id })
      .execute();

    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect(['user.otpCode', 'user.otpExpiresAt'])
      .where('user.otpCode = :token', { token: dto.token })
      .getOne();

    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('Reset token has expired');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ password: hashedPassword, otpCode: '', otpExpiresAt: new Date() })
      .where('id = :id', { id: user.id })
      .execute();
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ password: hashedPassword })
      .where('id = :id', { id: userId })
      .execute();
  }

  // ====================== 2FA ======================
  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = speakeasy.generateSecret({ name: `EduCRM:${user.email}` });

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ twoFaSecret: secret.base32 })
      .where('id = :id', { id: userId })
      .execute();

    const qrCode = await qrcode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode };
  }

  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.twoFaSecret')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user?.twoFaSecret) throw new BadRequestException('2FA not initialized');

    const isValid = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token,
    });

    if (!isValid) throw new BadRequestException('Invalid 2FA token');

    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ twoFaEnabled: true })
      .where('id = :id', { id: userId })
      .execute();
  }

  async disable2FA(userId: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ twoFaEnabled: false, twoFaSecret: '' })
      .where('id = :id', { id: userId })
      .execute();
  }
}
