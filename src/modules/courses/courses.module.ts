import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { LessonsController } from './lessons.controller';
import { CoursesService } from './courses.service';
import { CoursesRepository } from './courses.repository';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lesson.entity';
import { Enrollment } from './entities/enrollment.entity';
import { CourseModule } from './entities/module.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from '../files/files.module';
import { Teacher } from '../teachers/entities/teacher.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Lesson, Enrollment, CourseModule, Teacher]),
    FilesModule,
  ],
  controllers: [CoursesController, LessonsController],
  providers: [CoursesService, CoursesRepository],
  exports: [CoursesService, CoursesRepository],
})
export class CoursesModule {}
