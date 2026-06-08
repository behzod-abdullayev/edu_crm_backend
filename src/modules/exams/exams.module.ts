import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamsRepository } from './exams.repository';
import { Exam, ExamQuestion, ExamAttempt } from './entities/exam.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamQuestion, ExamAttempt])],
  controllers: [ExamsController],
  providers: [ExamsService, ExamsRepository],
  exports: [ExamsService],
})
export class ExamsModule {}
