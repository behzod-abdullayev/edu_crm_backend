import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class Enable2faDto {
  @ApiProperty({ description: '6-digit TOTP token from authenticator app', minLength: 6, maxLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  token: string;
}
