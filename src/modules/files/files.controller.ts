import {
  Controller, Get, Post, Delete, Param, UseGuards, Query,
  UseInterceptors, UploadedFile, ParseUUIDPipe, HttpCode,
  BadRequestException, UnauthorizedException, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody,
  ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { UploadResponseDto } from './dto/upload-response.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response.dto';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
    @Query('entity') relatedEntity?: string,
    @Query('entityId') relatedId?: string,
    @Query('public') isPublic?: string,
  ): Promise<UploadResponseDto> {
    if (!file) throw new BadRequestException('No file provided');
    return this.filesService.upload(file, tenantId, user.id, relatedEntity, relatedId, isPublic === 'true');
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  findAll(
    @TenantId() tenantId: string,
    @Query('entity') relatedEntity?: string,
    @Query('entityId') relatedId?: string,
  ) {
    return this.filesService.findAll(tenantId, relatedEntity, relatedId);
  }

  // IMPORTANT: static-prefix routes MUST come before parameterized routes of the same depth
  @Get('serve/:key')
  @Public()
  @ApiOperation({ summary: 'Serve a private file using a signed token' })
  @ApiParam({ name: 'key', description: 'URL-encoded file key' })
  @ApiQuery({ name: 'token', required: true, description: 'Signed JWT token from /files/:key/signed-url' })
  @ApiResponse({ status: 200, description: 'File content stream' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('key') key: string,
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) throw new UnauthorizedException('token query parameter is required');
    const decodedKey = decodeURIComponent(key);
    const { filePath, mimeType } = await this.filesService.serveFile(decodedKey, token);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=900');
    res.sendFile(filePath);
  }

  @Get(':key/signed-url')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Generate a signed URL for accessing a private file' })
  @ApiParam({ name: 'key', description: 'File key returned from upload endpoint' })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getSignedUrl(
    @Param('key') key: string,
    @TenantId() tenantId: string,
  ): Promise<SignedUrlResponseDto> {
    const decodedKey = decodeURIComponent(key);
    return this.filesService.getSignedUrlByKey(decodedKey, tenantId);
  }

  @Delete(':key')
  @ApiBearerAuth('JWT')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiParam({ name: 'key', description: 'File key returned from upload endpoint' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteByKey(
    @Param('key') key: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    const decodedKey = decodeURIComponent(key);
    return this.filesService.deleteByKey(decodedKey, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file info by UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.filesService.findOne(id, tenantId);
  }
}
