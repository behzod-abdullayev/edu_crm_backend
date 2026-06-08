import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeachersRepository } from './teachers.repository';
import { Teacher } from './entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { UsersModule } from '../users/users.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Teacher, User, Group, Schedule]),
    UsersModule,
    AttendanceModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService, TeachersRepository],
  exports: [TeachersService, TeachersRepository],
})
export class TeachersModule {}
