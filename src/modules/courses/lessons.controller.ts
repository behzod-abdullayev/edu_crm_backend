import {
  Controller,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  UseGuards,
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
  ApiProperty,
} from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CoursesService } from './courses.service';
import { FilesService } from '../files/files.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../shared/enums';
import { User } from '../users/entities/user.entity';

export class CreateLessonWithCourseDto extends CreateLessonDto {
  @ApiProperty({ description: 'ID of the course this lesson belongs to' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}

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
  @ApiOperation({ summary: 'Create a new lesson in a course' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  create(
    @Body() dto: CreateLessonWithCourseDto,
    @TenantId() tenantId: string,
  ) {
    const { courseId, ...lessonDto } = dto;
    return this.coursesService.addLesson(courseId, lessonDto, tenantId);
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
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'File uploaded and attached to lesson' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async uploadFile(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
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
}
