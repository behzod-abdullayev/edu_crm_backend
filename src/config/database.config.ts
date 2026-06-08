import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USERNAME', 'postgres'),
  password: config.get<string>('DB_PASSWORD', 'secret'),
  database: config.get<string>('DB_NAME', 'edu_crm'),
  ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  migrationsRun: false,
  synchronize: true,
  logging: config.get<string>('DB_LOGGING') === 'true',
});
