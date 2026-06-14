import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { FilesService } from '../files/files.service';
import { CreateLessonFromGroupDto } from './dto/create-lesson-from-group.dto';
import { AttachLessonFileDto } from './dto/attach-lesson-file.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../shared/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('lessons')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'lessons', version: '1' })
export class LessonsController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new lesson for a group (teacher upload)' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  create(
    @Body() dto: CreateLessonFromGroupDto,
    @TenantId() tenantId: string,
  ) {
    return this.coursesService.addLessonFromGroup(dto, tenantId);
  }

  @Post(':id/upload')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file for a lesson (video, PDF, etc.)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Lesson file (video, PDF, document)',
        },
        fileKey: {
          type: 'string',
          description: 'Storage key of a previously-uploaded file (JSON alternative to multipart file)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File uploaded and attached to lesson' })
  @ApiResponse({ status: 400, description: 'No file or fileKey provided' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async uploadFile(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: AttachLessonFileDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    if (file) {
      const uploaded = await this.filesService.upload(
        file,
        tenantId,
        user.id,
        'lesson',
        lessonId,
        false,
      );
      return this.coursesService.attachFileToLesson(lessonId, uploaded.key, tenantId);
    }

    if (body?.fileKey) {
      return this.coursesService.attachFileToLesson(lessonId, body.fileKey, tenantId);
    }

    throw new BadRequestException('Either a file or a fileKey is required');
  }
}
