import { ApiProperty } from '@nestjs/swagger';
import { MeResponseDto } from './me-response.dto';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (short-lived)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (long-lived)' })
  refreshToken: string;

  @ApiProperty({ type: MeResponseDto, description: 'Authenticated user profile with permissions' })
  user: MeResponseDto;
}
