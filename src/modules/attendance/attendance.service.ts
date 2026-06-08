import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceRepository } from './attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async mark(dto: any, tenantId: string, markedBy: string): Promise<any> {
    const existing = await this.attendanceRepository.findOne({
      where: { scheduleId: dto.scheduleId, studentId: dto.studentId, tenantId },
    });

    if (existing) {
      await this.attendanceRepository.update(existing.id, {
        status: dto.status,
        lateMinutes: dto.lateMinutes,
        notes: dto.notes,
        markedBy,
      } as any);
      const updated = await this.attendanceRepository.findOne({ where: { id: existing.id } });
      if (updated) {
        this.eventEmitter.emit('attendance.marked', { studentId: dto.studentId, attendance: updated });
      }
      return updated;
    }

    const schedule = await this.dataSource.query(
      `SELECT group_id, teacher_id FROM schedules WHERE id = $1`,
      [dto.scheduleId],
    );
    const attendance = this.attendanceRepository.create({
      ...dto,
      tenantId,
      markedBy,
      markedAt: new Date(),
      groupId: schedule[0]?.group_id,
      teacherId: schedule[0]?.teacher_id,
    } as any);
    const saved = await this.attendanceRepository.save(attendance);
    this.eventEmitter.emit('attendance.marked', { studentId: dto.studentId, attendance: saved });
    return saved;
  }

  async bulkMark(dto: any, tenantId: string, markedBy: string): Promise<any> {
    const results = await Promise.all(
      dto.attendances.map((a: any) => this.mark({ ...a, scheduleId: dto.scheduleId }, tenantId, markedBy)),
    );
    return { marked: results.length, records: results };
  }

  async findAll(tenantId: string, query: any): Promise<any> {
    const { scheduleId, studentId, groupId, from, to } = query;
    let q = this.attendanceRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.student' as any, 'student')
      .where('a.tenantId = :tenantId', { tenantId });
    if (scheduleId) q = q.andWhere('a.scheduleId = :scheduleId', { scheduleId });
    if (studentId) q = q.andWhere('a.studentId = :studentId', { studentId });
    if (groupId) q = q.andWhere('a.groupId = :groupId', { groupId });
    if (from) q = q.andWhere('a.markedAt >= :from', { from: new Date(from) });
    if (to) q = q.andWhere('a.markedAt <= :to', { to: new Date(to) });
    return q.orderBy('a.markedAt', 'DESC').getMany();
  }

  async getReport(tenantId: string, from: Date, to: Date, groupId?: string, studentId?: string): Promise<any[]> {
    return this.attendanceRepository.getReport(tenantId, from, to, groupId, studentId);
  }

  async getStudentSummary(studentId: string, tenantId: string): Promise<any> {
    return this.attendanceRepository.getStudentSummary(studentId, tenantId);
  }
}
