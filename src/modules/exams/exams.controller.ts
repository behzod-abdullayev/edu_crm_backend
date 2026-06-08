import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { PaginationDto } from '../../common/utils/pagination.util';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { CreateExamDto, CreateExamQuestionDto, UpdateExamDto } from './dto/create-exam.dto';
import { ExamResponseDto, ExamAttemptResponseDto, ExamQuestionResponseDto } from './dto/exam-response.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@ApiTags('Exams')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(ExamResponseDto, ExamAttemptResponseDto, ExamQuestionResponseDto)
@Controller({ path: 'exams', version: '1' })
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create an exam' })
  @ApiResponse({ status: 201, type: ExamResponseDto, description: 'Exam created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateExamDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.examsService.create(dto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all exams' })
  @ApiPaginatedResponse(ExamResponseDto)
  findAll(@TenantId() tenantId: string, @Query() query: PaginationDto) {
    return this.examsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam details' })
  @ApiResponse({ status: 200, type: ExamResponseDto, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.examsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update exam' })
  @ApiResponse({ status: 200, type: ExamResponseDto, description: 'Exam updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, tenantId, dto);
  }

  @Patch(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Publish exam' })
  @ApiResponse({ status: 200, type: ExamResponseDto, description: 'Exam published' })
  @ApiResponse({ status: 404, description: 'Not found' })
  publish(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.examsService.publish(id, tenantId);
  }

  @Post(':id/questions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add question to exam' })
  @ApiResponse({ status: 201, type: ExamQuestionResponseDto, description: 'Question added' })
  addQuestion(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string, @Body() dto: CreateExamQuestionDto) {
    return this.examsService.addQuestion(id, tenantId, dto);
  }

  @Post(':id/questions/bulk')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Add multiple questions to exam' })
  @ApiResponse({ status: 201, type: ExamQuestionResponseDto, isArray: true, description: 'Questions added' })
  addQuestionsBulk(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string, @Body() questions: CreateExamQuestionDto[]) {
    return this.examsService.addQuestionsBulk(id, tenantId, questions);
  }

  @Post(':id/start')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start exam attempt' })
  @ApiResponse({ status: 201, type: ExamAttemptResponseDto, description: 'Attempt started' })
  @ApiResponse({ status: 400, description: 'Max attempts reached or exam not published' })
  startAttempt(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.examsService.startAttempt(id, user.id, tenantId);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit exam attempt' })
  @ApiResponse({ status: 201, type: ExamAttemptResponseDto, description: 'Attempt submitted with score' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  submitAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: User,
    @Body() body: SubmitExamDto,
  ) {
    return this.examsService.submitAttempt(attemptId, user.id, body.answers);
  }

  @Get(':id/attempts')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get exam attempts' })
  @ApiResponse({ status: 200, type: ExamAttemptResponseDto, isArray: true, description: 'List of attempts' })
  getAttempts(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.examsService.getAttempts(id, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete exam' })
  @ApiResponse({ status: 200, description: 'Exam deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.examsService.remove(id, tenantId);
  }
}
