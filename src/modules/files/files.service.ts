import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as path from 'path';
import * as fs from 'fs';
import * as mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';

import { File } from './entities/file.entity';
import { FileType, StorageProvider } from '../../shared/enums';
import { UploadResponseDto } from './dto/upload-response.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response.dto';

interface IStorageProvider {
  upload(file: Express.Multer.File, tenantId: string): Promise<{ url: string; key: string; provider: StorageProvider }>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly baseDir: string) {}

  async upload(file: Express.Multer.File, tenantId: string): Promise<{ url: string; key: string; provider: StorageProvider }> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const subDir = path.join(this.baseDir, tenantId, year, month);

    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    const filePath = path.join(subDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    const key = `${tenantId}/${year}/${month}/${filename}`;
    return { url: `/uploads/${key}`, key, provider: StorageProvider.LOCAL };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    return `/uploads/${key}`;
  }
}

class S3StorageProvider implements IStorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(configService: ConfigService) {
    this.region = configService.get<string>('AWS_REGION', 'us-east-1');
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucket = configService.get<string>('AWS_S3_BUCKET', '');
  }

  async upload(file: Express.Multer.File, tenantId: string): Promise<{ url: string; key: string; provider: StorageProvider }> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = path.extname(file.originalname);
    const key = `${tenantId}/${year}/${month}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { url, key, provider: StorageProvider.S3 };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.s3Client.send(command);
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getS3SignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }
}

interface FileAccessTokenPayload {
  key: string;
  tenantId: string;
  type: string;
}

@Injectable()
export class FilesService {
  private readonly storageProvider: IStorageProvider;
  private readonly maxSizeBytes: number;
  private readonly allowedTypes: string[];

  constructor(
    @InjectRepository(File) private fileRepo: Repository<File>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const providerType = this.configService.get<string>('STORAGE_PROVIDER', 'local');
    this.maxSizeBytes = this.configService.get<number>('UPLOADS_MAX_SIZE_MB', 10) * 1024 * 1024;
    this.allowedTypes = this.configService
      .get<string>('UPLOADS_ALLOWED_TYPES', 'image/jpeg,image/png,image/gif,application/pdf,video/mp4')
      .split(',')
      .map((t) => t.trim());

    if (providerType === 's3') {
      this.storageProvider = new S3StorageProvider(configService);
    } else {
      const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      this.storageProvider = new LocalStorageProvider(uploadDir);
    }
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'].some((t) =>
        mimeType.startsWith(t),
      )
    )
      return FileType.DOCUMENT;
    if (['application/zip', 'application/x-rar'].includes(mimeType)) return FileType.ARCHIVE;
    return FileType.OTHER;
  }

  async upload(
    file: Express.Multer.File,
    tenantId: string,
    uploadedBy: string,
    relatedEntity?: string,
    relatedId?: string,
    isPublic = false,
  ): Promise<UploadResponseDto> {
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(`File size exceeds limit of ${this.maxSizeBytes / 1024 / 1024}MB`);
    }
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed: ${this.allowedTypes.join(', ')}`,
      );
    }

    const { url, key, provider } = await this.storageProvider.upload(file, tenantId);
    const fileRecord = this.fileRepo.create({
      tenantId,
      uploadedBy,
      originalName: file.originalname,
      storedName: path.basename(key),
      path: key,
      url,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type: this.getFileType(file.mimetype),
      provider,
      relatedEntity,
      relatedId,
      isPublic,
    });
    const savedFile = await this.fileRepo.save(fileRecord);

    return {
      url: savedFile.url,
      key: savedFile.path,
      filename: savedFile.originalName,
    };
  }

  async findAll(tenantId: string, relatedEntity?: string, relatedId?: string): Promise<File[]> {
    const qb = this.fileRepo
      .createQueryBuilder('f')
      .where('f.tenantId = :tenantId', { tenantId })
      .orderBy('f.createdAt', 'DESC');
    if (relatedEntity) qb.andWhere('f.relatedEntity = :relatedEntity', { relatedEntity });
    if (relatedId) qb.andWhere('f.relatedId = :relatedId', { relatedId });
    return qb.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<File> {
    const f = await this.fileRepo.findOne({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('File not found');
    return f;
  }

  async getSignedUrlByKey(key: string, tenantId: string): Promise<SignedUrlResponseDto> {
    const file = await this.fileRepo.findOne({ where: { path: key, tenantId } });
    if (!file) throw new NotFoundException(`File with key "${key}" not found`);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const token = this.jwtService.sign(
      { key, tenantId, type: 'file-access' },
      { expiresIn: '15m' },
    );

    const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:4001');
    const signedUrl = `${baseUrl}/api/v1/files/serve/${encodeURIComponent(key)}?token=${token}`;

    return {
      url: signedUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async deleteByKey(key: string, tenantId: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { path: key, tenantId } });
    if (!file) throw new NotFoundException(`File with key "${key}" not found`);

    await this.storageProvider.delete(key);
    await this.fileRepo.remove(file);
  }

  async serveFile(key: string, token: string): Promise<{ filePath: string; mimeType: string }> {
    let payload: FileAccessTokenPayload;
    try {
      payload = this.jwtService.verify<FileAccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired file access token');
    }

    if (payload.type !== 'file-access' || payload.key !== key) {
      throw new UnauthorizedException('Token does not grant access to this file');
    }

    const file = await this.fileRepo.findOne({ where: { path: key, tenantId: payload.tenantId } });
    if (!file) throw new NotFoundException('File not found');

    const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    const filePath = path.resolve(uploadDir, key);
    const resolvedMime = mime.lookup(key);
    const mimeType = file.mimeType || (resolvedMime !== false ? resolvedMime : 'application/octet-stream');

    return { filePath, mimeType };
  }
}
