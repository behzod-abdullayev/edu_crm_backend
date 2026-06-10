import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../shared/enums';

// Used by POST /owner/users/invite (Owner > Users > "Invite" dialog).
export class OwnerInviteUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
}
