import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulesRepository } from './schedules.repository';

@Injectable()
export class SchedulesService {
  constructor(
    private schedulesRepository: SchedulesRepository,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: any, tenantId: string): Promise<any> {
    const schedule = this.schedulesRepository.create({ ...dto, tenantId, date: new Date(dto.date) } as any);
    const saved = await this.schedulesRepository.save(schedule);
    this.eventEmitter.emit('schedule.updated', {
      tenantId,
      schedule: saved,
      affectedUserIds: [] as string[],
    });
    return saved;
  }

  async bulkCreate(dto: any, tenantId: string): Promise<any> {
    const { groupId, teacherId, courseId, startDate, endDate, daysOfWeek, startTime, endTime, classroom } = dto;
    const schedules: any[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay(); // 1=Mon, 7=Sun
      if (daysOfWeek.includes(dayOfWeek)) {
        schedules.push(
          this.schedulesRepository.create({
            tenantId, groupId, teacherId, courseId,
            date: new Date(current),
            startTime, endTime, classroom,
            type: 'regular', status: 'scheduled',
          } as any),
        );
      }
      current.setDate(current.getDate() + 1);
    }
    const saved = await this.schedulesRepository.save(schedules);
    return { created: saved.length, schedules: saved };
  }

  async getCalendar(tenantId: string, from: Date, to: Date, groupId?: string, teacherId?: string): Promise<any[]> {
    return this.schedulesRepository.findCalendar(tenantId, from, to, groupId, teacherId);
  }

  async getTeacherSchedule(teacherId: string, tenantId: string): Promise<any[]> {
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 7);
    return this.schedulesRepository.findCalendar(tenantId, from, to, undefined, teacherId);
  }

  async getStudentSchedule(studentId: string, tenantId: string): Promise<any[]> {
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 14);
    return this.schedulesRepository.findForStudent(studentId, tenantId, from, to);
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const schedule = await this.schedulesRepository.findOne({ where: { id, tenantId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async update(id: string, dto: any, tenantId: string): Promise<any> {
    await this.findOne(id, tenantId);
    await this.schedulesRepository.update(id, dto);
    const updated = await this.findOne(id, tenantId);
    this.eventEmitter.emit('schedule.updated', {
      tenantId,
      schedule: updated,
      affectedUserIds: [] as string[],
    });
    return updated;
  }

  async cancel(id: string, reason: string | undefined, tenantId: string): Promise<any> {
    const schedule = await this.findOne(id, tenantId);
    await this.schedulesRepository.update(id, { status: 'cancelled', cancelReason: reason } as any);
    this.eventEmitter.emit('schedule.cancelled', { schedule, tenantId });
    return { message: 'Schedule cancelled' };
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.schedulesRepository.softDelete(id);
  }
}
