import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateTeacherDto } from './create-teacher.dto';
import { UserStatus } from '../../../shared/enums';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
