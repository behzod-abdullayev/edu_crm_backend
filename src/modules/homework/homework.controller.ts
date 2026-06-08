import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { PaginationDto } from '../../common/utils/pagination.util';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { HomeworkResponseDto } from './dto/homework-response.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { SubmissionResponseDto } from './dto/submission-response.dto';

// ─── FIX: HomeworkController ──────────────────────────────────────────────────
//
// MUAMMO: Frontend prompt grading endpoint'ni quyidagicha kutadi:
//   POST /homework/:id/grade/:submissionId
//
// Avvalgi backend implementation:
//   PATCH /homework/submissions/:subId/grade
//
// YECHIM:
//   1. Eski PATCH /homework/submissions/:subId/grade — SAQLANADI (backward compat)
//   2. Yangi POST /homework/:id/grade/:submissionId — QO'SHILDI (prompt bilan mos)
//
// Ikkala route ham bir xil HomeworkService.grade() ni chaqiradi.
//
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Homework')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(HomeworkResponseDto, SubmissionResponseDto)
@Controller({ path: 'homework', version: '1' })
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create homework assignment' })
  @ApiResponse({ status: 201, type: HomeworkResponseDto, description: 'Homework created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateHomeworkDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.homeworkService.create(dto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List homework assignments' })
  @ApiPaginatedResponse(HomeworkResponseDto)
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto & { groupId?: string; teacherId?: string }) {
    return this.homeworkService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get homework details' })
  @ApiResponse({ status: 200, type: HomeworkResponseDto, description: 'Homework details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.homeworkService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update homework assignment' })
  @ApiResponse({ status: 200, type: HomeworkResponseDto, description: 'Homework updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomeworkDto,
    @TenantId() tenantId: string,
  ) {
    return this.homeworkService.update(id, dto, tenantId);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit homework' })
  @ApiResponse({ status: 201, type: SubmissionResponseDto, description: 'Homework submitted' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Body() data: { content?: string },
    @CurrentUser() user: User,
  ) {
    return this.homeworkService.submit(id, user.id, tenantId, data);
  }

  // ── YANGI: Frontend prompt bilan to'liq mos ────────────────────────────────
  // POST /homework/:id/grade/:submissionId
  @Post(':id/grade/:submissionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Grade a homework submission (frontend-compatible URL)' })
  @ApiResponse({ status: 201, type: SubmissionResponseDto, description: 'Submission graded' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  gradeByHomeworkId(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @TenantId() tenantId: string,
    @Body() body: GradeSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.homeworkService.grade(submissionId, tenantId, body.score, body.feedback ?? '', user.id);
  }

  // ── ESKI: Backward compatibility uchun saqlanadi ───────────────────────────
  // PATCH /homework/submissions/:subId/grade
  @Patch('submissions/:subId/grade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Grade a homework submission (legacy URL)' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto, description: 'Submission graded' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  grade(
    @Param('subId', ParseUUIDPipe) subId: string,
    @TenantId() tenantId: string,
    @Body() body: GradeSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.homeworkService.grade(subId, tenantId, body.score, body.feedback ?? '', user.id);
  }

  @Get(':id/submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all submissions for homework' })
  @ApiResponse({ status: 200, type: SubmissionResponseDto, isArray: true, description: 'List of submissions' })
  @ApiResponse({ status: 404, description: 'Homework not found' })
  getSubmissions(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.homeworkService.getSubmissions(id, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete homework' })
  @ApiResponse({ status: 200, description: 'Homework deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.homeworkService.remove(id, tenantId);
  }
}
