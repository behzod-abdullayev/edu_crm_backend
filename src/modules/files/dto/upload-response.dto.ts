import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'Public URL of the uploaded file' })
  url: string;

  @ApiProperty({ description: 'Unique file key (used for signed URL and delete operations)' })
  key: string;

  @ApiProperty({ description: 'Original filename as uploaded by the user' })
  filename: string;
}
