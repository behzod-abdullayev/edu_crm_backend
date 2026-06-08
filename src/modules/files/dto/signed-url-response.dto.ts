import { ApiProperty } from '@nestjs/swagger';

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Time-limited signed URL to access the private file' })
  url: string;

  @ApiProperty({ description: 'ISO timestamp when this signed URL expires (15 minutes from now)' })
  expiresAt: string;
}
