import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

// ─── FIX: login.dto.ts ────────────────────────────────────────────────────────
//
// O'zgarishsiz, lekin ForgotPasswordDto va VerifyOtpDto re-export qoladi.
// Frontend prompt:
//   POST /auth/forgot-password  → { email }
//   POST /auth/reset-password   → { token, password }
//
// Backend qo'shimcha ravishda:
//   POST /auth/verify-otp       → { email, otp }   ← bu EXTRA endpoint
//
// Frontend forgot-password page'i ikki xil strategiya bilan ishlaydi:
//   A) 2-qadam: forgot → reset (token emailda keladi) — prompt ko'rsatgan
//   B) 3-qadam: forgot → verify-otp → reset — backend qo'llab-quvvatlaydi
//
// Ikkala DTO ham Swagger'da ko'rinadi va orval type generation'da
// frontend uchun avtomatik tip yaratadi.
//
// ─────────────────────────────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'admin@educrm.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '2FA token if enabled' })
  @IsOptional()
  @IsString()
  twoFaToken?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received via email' })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// Re-export from their canonical location
export { ForgotPasswordDto, VerifyOtpDto } from './forgot-password.dto';
