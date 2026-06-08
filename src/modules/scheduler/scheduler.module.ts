import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { Payment } from '../payments/entities/payment.entity';
import { Student } from '../students/entities/student.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Student, Tenant, Schedule])],
  providers: [SchedulerService],
})
export class SchedulerModule {}
