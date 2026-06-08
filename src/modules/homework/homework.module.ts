import { Module } from '@nestjs/common';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import { HomeworkRepository } from './homework.repository';
import { Homework, HomeworkSubmission } from './entities/homework.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Homework, HomeworkSubmission])],
  controllers: [HomeworkController],
  providers: [HomeworkService, HomeworkRepository],
  exports: [HomeworkService],
})
export class HomeworkModule {}
