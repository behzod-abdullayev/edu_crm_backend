import { ApiProperty } from '@nestjs/swagger';

export class AttendanceBulkResponseDto {
  @ApiProperty({
    description: 'Number of new attendance records created',
    example: 8,
  })
  created: number;

  @ApiProperty({
    description: 'Number of existing attendance records updated',
    example: 2,
  })
  updated: number;

  @ApiProperty({
    description: 'UUIDs of all saved attendance records (created + updated)',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  ids: string[];
}
