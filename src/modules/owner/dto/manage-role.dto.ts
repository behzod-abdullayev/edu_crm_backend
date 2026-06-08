import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ManageRoleDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() roleId: string;
  @ApiProperty() @IsString() action: string;
}
