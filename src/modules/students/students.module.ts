import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { Student } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { Enrollment } from '../courses/entities/enrollment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { UsersModule } from '../users/users.module';
import { HomeworkModule } from '../homework/homework.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, User, Enrollment, Attendance, Payment, Certificate]),
    UsersModule,
    HomeworkModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService, StudentsRepository],
})
export class StudentsModule {}
