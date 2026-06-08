import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'local',
  uploadsDest: process.env.UPLOADS_DEST || './uploads',
  maxSizeMb: parseInt(process.env.UPLOADS_MAX_SIZE_MB || '50', 10),
  allowedTypes: (process.env.UPLOADS_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf,video/mp4').split(','),
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsS3Bucket: process.env.AWS_S3_BUCKET || 'educrm-files',
}));
