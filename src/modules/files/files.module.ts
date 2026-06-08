import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesRepository } from './files.repository';
import { File } from './entities/file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: diskStorage({
          destination: (req, file, cb) => {
            const tenantId = (req as any).tenantId || 'default';
            const dest = join(config.get('UPLOADS_DEST', './uploads'), tenantId);
            require('fs').mkdirSync(dest, { recursive: true });
            cb(null, dest);
          },
          filename: (req, file, cb) => {
            cb(null, `${uuidv4()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: config.get<number>('UPLOADS_MAX_SIZE_MB', 50) * 1024 * 1024 },
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'default-secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
