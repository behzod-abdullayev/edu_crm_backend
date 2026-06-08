import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

// ─── FIX: forgot-password.dto.ts ─────────────────────────────────────────────
//
// Frontend 3-qadam OTP flow'ni qo'llab-quvvatlaydi:
//   1. POST /auth/forgot-password  → { email }           → OTP emailga yuboriladi
//   2. POST /auth/verify-otp       → { email, otp }      → reset token qaytadi
//   3. POST /auth/reset-password   → { token, password } → parol yangilanadi
//
// Bu DTOlar Swagger orqali orval type generation'ga kiradi,
// frontend avtomatik typed hook va Zod schema oladi.
//
// ─────────────────────────────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address associated with the account',
  })
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address used in forgot-password step',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: '6-digit OTP code sent to email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp: string;
}
