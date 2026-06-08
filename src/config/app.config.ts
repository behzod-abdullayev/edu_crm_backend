import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
}));
