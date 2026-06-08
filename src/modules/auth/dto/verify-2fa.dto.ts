import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class Verify2faDto {
  @ApiProperty({ example: '123456', description: 'TOTP token from authenticator app' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}

export class Disable2faDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
