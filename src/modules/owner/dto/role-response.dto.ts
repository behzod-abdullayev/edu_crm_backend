import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty() isSystem: boolean;
  @ApiProperty() userCount: number;
}
