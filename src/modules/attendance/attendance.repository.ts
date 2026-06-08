import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class AttendanceRepository extends Repository<Attendance> {
  constructor(private dataSource: DataSource) {
    super(Attendance, dataSource.createEntityManager());
  }

  async findBySchedule(scheduleId: string): Promise<Attendance[]> {
    return this.find({ where: { scheduleId }, relations: ['student', 'student.user'] });
  }

  async getStudentSummary(studentId: string, tenantId: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status='excused' THEN 1 ELSE 0 END) as excused
       FROM attendances WHERE student_id = $1 AND tenant_id = $2`,
      [studentId, tenantId],
    );
    const row = result[0];
    const total = parseInt(row.total, 10);
    return {
      total,
      present: parseInt(row.present, 10),
      absent: parseInt(row.absent, 10),
      late: parseInt(row.late, 10),
      excused: parseInt(row.excused, 10),
      attendanceRate: total > 0 ? Math.round((parseInt(row.present, 10) / total) * 100) : 0,
    };
  }

  async getReport(tenantId: string, from: Date, to: Date, groupId?: string, studentId?: string): Promise<any[]> {
    let query = `SELECT a.*, u.first_name, u.last_name, s.student_code
       FROM attendances a
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.user_id
       WHERE a.tenant_id = $1 AND a.marked_at BETWEEN $2 AND $3`;
    const params: any[] = [tenantId, from, to];
    if (groupId) { query += ` AND a.group_id = $${params.length + 1}`; params.push(groupId); }
    if (studentId) { query += ` AND a.student_id = $${params.length + 1}`; params.push(studentId); }
    return this.dataSource.query(query, params);
  }
}
