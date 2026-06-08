import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AdminOverviewDto, OperationalReportDto, DebtReportItemDto,
  PaymentMonitoringFilters, ManageCourseDto, ManageScheduleDto,
  ManageGroupDto, BulkNotificationDto, UpdatePricingDto, EnrollStudentDto,
} from './dto/admin.dto';
import { AdminDashboardDto, ActivityItemDto } from './dto/admin-dashboard.dto';
import { AdminAnalyticsDto, MonthlyDataPointDto } from './dto/admin-analytics.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { CourseStatus } from '../../shared/enums';

export interface PaymentMonitorRow {
  id: string; first_name: string; last_name: string; email: string;
  total_amount: string; status: string; created_at: Date;
}
export interface PaymentSummaryRow { status: string; count: string; total: string; }
interface CountRow { count: string; }
interface RevenueRow { total: string; }
interface AttendanceRow { total: string; present: string; }
interface HomeworkRow { assigned: string; graded: string; }
interface ExamRow { total: string; avg_score: string; }
interface EnrollmentRow { id: string; }
interface LessonCountRow { count: string; }
interface UserRow { id: string; }
interface MonthlyRevenueRow { total: string; }
interface MonthlyCountRow { count: string; }
interface MonthlyAttRow { total: string; present: string; }

@Injectable()
export class AdminService {
  constructor(
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async getOverview(tenantId: string): Promise<AdminOverviewDto> {
    const [students, teachers, courses, groups, revenue, attendanceToday] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM courses WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM groups WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW())`,
        [tenantId],
      ) as Promise<RevenueRow[]>,
      this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND DATE(marked_at) = CURRENT_DATE`,
        [tenantId],
      ) as Promise<AttendanceRow[]>,
    ]);

    const att = attendanceToday[0];
    return {
      totalStudents: parseInt(students[0].count, 10),
      totalTeachers: parseInt(teachers[0].count, 10),
      totalCourses: parseInt(courses[0].count, 10),
      totalGroups: parseInt(groups[0].count, 10),
      monthlyRevenue: parseFloat(revenue[0].total),
      todayAttendanceRate: parseInt(att.total, 10) > 0
        ? Math.round((parseInt(att.present, 10) / parseInt(att.total, 10)) * 100)
        : 0,
    };
  }

  async getDashboard(tenantId: string): Promise<AdminDashboardDto> {
    const [students, teachers, courses, activeGroups, pendingPayments] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM courses WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM groups WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM payments WHERE tenant_id = $1 AND status = 'pending'`, [tenantId]) as Promise<CountRow[]>,
    ]);

    const revenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid'`,
      [tenantId],
    ) as RevenueRow[];
    const totalRevenue = parseFloat(revenueResult[0]?.total ?? '0');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const attendanceResult = await this.dataSource.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND marked_at >= $2`,
      [tenantId, thirtyDaysAgo],
    ) as AttendanceRow[];
    const total = parseInt(attendanceResult[0]?.total ?? '0', 10);
    const present = parseInt(attendanceResult[0]?.present ?? '0', 10);
    const attendanceRate = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;

    const recentActivities: ActivityItemDto[] = [];

    const overdueResult = await this.dataSource.query(
      `SELECT COUNT(*) FROM payments WHERE tenant_id = $1 AND status = 'overdue'`,
      [tenantId],
    ) as CountRow[];
    const overduePayments = parseInt(overdueResult[0]?.count ?? '0', 10);

    const newStudentsResult = await this.dataSource.query(
      `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL AND created_at >= DATE_TRUNC('month', NOW())`,
      [tenantId],
    ) as CountRow[];
    const newStudentsThisMonth = parseInt(newStudentsResult[0]?.count ?? '0', 10);

    const prevMonthRevenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND paid_at < DATE_TRUNC('month', NOW())`,
      [tenantId],
    ) as RevenueRow[];
    const prevRevenue = parseFloat(prevMonthRevenueResult[0]?.total ?? '0');
    const revenueChangePercent = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100 * 10) / 10
      : 0;

    const todayAttResult = await this.dataSource.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND DATE(marked_at) = CURRENT_DATE`,
      [tenantId],
    ) as AttendanceRow[];
    const todayTotal = parseInt(todayAttResult[0]?.total ?? '0', 10);
    const todayPresent = parseInt(todayAttResult[0]?.present ?? '0', 10);
    const todayAttendanceRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100 * 10) / 10 : 0;

    return {
      totalStudents: parseInt(students[0].count, 10),
      totalTeachers: parseInt(teachers[0].count, 10),
      totalCourses: parseInt(courses[0].count, 10),
      totalRevenue,
      currency: 'UZS',
      activeGroups: parseInt(activeGroups[0].count, 10),
      pendingPayments: parseInt(pendingPayments[0].count, 10),
      overduePayments,
      attendanceRate,
      todayAttendanceRate,
      newStudentsThisMonth,
      revenueChangePercent,
      recentActivities,
    };
  }

  async getAnalytics(tenantId: string): Promise<AdminAnalyticsDto> {
    const revenueByMonth: MonthlyDataPointDto[] = [];
    const enrollmentsByMonth: MonthlyDataPointDto[] = [];
    const attendanceByMonth: MonthlyDataPointDto[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const revResult = await this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid' AND paid_at BETWEEN $2 AND $3`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyRevenueRow[];
      revenueByMonth.push({ month: monthKey, value: parseFloat(revResult[0]?.total ?? '0') });

      const enrollResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3 AND deleted_at IS NULL`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyCountRow[];
      enrollmentsByMonth.push({ month: monthKey, value: parseInt(enrollResult[0]?.count ?? '0', 10) });

      const attResult = await this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND marked_at BETWEEN $2 AND $3`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyAttRow[];
      const t = parseInt(attResult[0]?.total ?? '0', 10);
      const p = parseInt(attResult[0]?.present ?? '0', 10);
      attendanceByMonth.push({ month: monthKey, value: t > 0 ? Math.round((p / t) * 100 * 10) / 10 : 0 });
    }

    const totalRevenue = revenueByMonth.reduce((s, m) => s + m.value, 0);
    const totalEnrollments = enrollmentsByMonth.reduce((s, m) => s + m.value, 0);
    const avgAttendanceRate = attendanceByMonth.length > 0
      ? Math.round((attendanceByMonth.reduce((s, m) => s + m.value, 0) / attendanceByMonth.length) * 10) / 10
      : 0;

    return { revenueByMonth, enrollmentsByMonth, attendanceByMonth, avgAttendanceRate, totalRevenue, totalEnrollments, revenueTimeline: [], attendanceTrend: [], enrollmentTrend: [], topCourses: [] };
  }

  async getReportByType(type: string, tenantId: string, query: ReportQueryDto): Promise<Record<string, unknown>> {
    switch (type) {
      case 'operational':
        return this.buildOperationalReport(tenantId, query);
      case 'debt':
        return this.buildDebtReport(tenantId, query);
      case 'attendance':
        return this.buildAttendanceReport(tenantId, query);
      case 'payments':
        return this.buildPaymentsReport(tenantId, query);
      default:
        throw new BadRequestException(`Unknown report type: ${type}. Valid types: operational, debt, attendance, payments`);
    }
  }

  private async buildOperationalReport(tenantId: string, query: ReportQueryDto): Promise<Record<string, unknown>> {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const reportDto = await this.getOperationalReport(tenantId, from, to);
    return { type: 'operational', ...reportDto };
  }

  private async buildDebtReport(tenantId: string, _query: ReportQueryDto): Promise<Record<string, unknown>> {
    const debtors = await this.getDebtReport(tenantId);
    const totalDebt = debtors.reduce((s, d) => s + d.debtAmount, 0);
    return { type: 'debt', totalDebt, currency: 'UZS', debtors: debtors.length, items: debtors };
  }

  private async buildAttendanceReport(tenantId: string, query: ReportQueryDto): Promise<Record<string, unknown>> {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND marked_at BETWEEN $2 AND $3`,
      [tenantId, from, to],
    ) as AttendanceRow[];
    const total = parseInt(result[0]?.total ?? '0', 10);
    const present = parseInt(result[0]?.present ?? '0', 10);
    const rate = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;
    return { type: 'attendance', total, present, rate, from: from.toISOString(), to: to.toISOString() };
  }

  private async buildPaymentsReport(tenantId: string, query: ReportQueryDto): Promise<Record<string, unknown>> {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const result = await this.dataSource.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3 GROUP BY status`,
      [tenantId, from, to],
    ) as Array<{ status: string; count: string; total: string }>;
    return { type: 'payments', from: from.toISOString(), to: to.toISOString(), byStatus: result };
  }

  async getPaymentMonitoring(tenantId: string, filters: PaymentMonitoringFilters): Promise<{ payments: PaymentMonitorRow[]; summary: PaymentSummaryRow[] }> {
    const { from, to, status } = filters;
    let query = `
      SELECT p.*, u.first_name, u.last_name, u.email
      FROM payments p
      JOIN students s ON s.id = p.student_id
      JOIN users u ON u.id = s.user_id
      WHERE p.tenant_id = $1
    `;
    const params: (string | number)[] = [tenantId];
    if (status) { query += ` AND p.status = $${params.length + 1}`; params.push(status); }
    if (from) { query += ` AND p.created_at >= $${params.length + 1}`; params.push(from); }
    if (to) { query += ` AND p.created_at <= $${params.length + 1}`; params.push(to); }
    query += ` ORDER BY p.created_at DESC LIMIT 100`;

    const payments = await this.dataSource.query(query, params) as PaymentMonitorRow[];
    const summary = await this.dataSource.query(
      `SELECT status, COUNT(*), SUM(total_amount) as total FROM payments WHERE tenant_id = $1 GROUP BY status`,
      [tenantId],
    ) as PaymentSummaryRow[];
    return { payments, summary };
  }

  async getOperationalReport(tenantId: string, from: Date, to: Date): Promise<OperationalReportDto> {
    const [enrollment, attendance, homework, exams, revenue] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) as new_enrollments FROM enrollments WHERE tenant_id = $1 AND enrolled_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ) as Promise<Array<{ new_enrollments: string }>>,
      this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id = $1 AND marked_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ) as Promise<AttendanceRow[]>,
      this.dataSource.query(
        `SELECT COUNT(*) as assigned, SUM(CASE WHEN status='graded' THEN 1 ELSE 0 END) as graded FROM homework_submissions WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ) as Promise<HomeworkRow[]>,
      this.dataSource.query(
        `SELECT COUNT(*) as total, AVG(total_score) as avg_score FROM exam_results WHERE tenant_id = $1 AND submitted_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ) as Promise<ExamRow[]>,
      this.dataSource.query(
        `SELECT SUM(total_amount) as total FROM payments WHERE tenant_id = $1 AND status='paid' AND paid_at BETWEEN $2 AND $3`,
        [tenantId, from, to],
      ) as Promise<RevenueRow[]>,
    ]);

    const att = attendance[0];
    return {
      period: { from, to },
      newEnrollments: parseInt(enrollment[0].new_enrollments, 10),
      attendanceRate: parseInt(att.total, 10) > 0
        ? Math.round((parseInt(att.present, 10) / parseInt(att.total, 10)) * 100)
        : 0,
      homeworkGradedRate: parseInt(homework[0].assigned, 10) > 0
        ? Math.round((parseInt(homework[0].graded, 10) / parseInt(homework[0].assigned, 10)) * 100)
        : 0,
      avgExamScore: parseFloat(exams[0].avg_score) || 0,
      totalRevenue: parseFloat(revenue[0].total) || 0,
    };
  }

  async enrollStudent(tenantId: string, dto: EnrollStudentDto): Promise<{ message: string }> {
    const { studentId, courseId, groupId } = dto;
    const existing = await this.dataSource.query(
      `SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND tenant_id = $3 AND status = 'active'`,
      [studentId, courseId, tenantId],
    ) as EnrollmentRow[];
    if (existing.length > 0) throw new BadRequestException('Student already enrolled in this course');

    const totalLessons = await this.dataSource.query(
      `SELECT COUNT(*) FROM lessons WHERE course_id = $1 AND is_published = true`,
      [courseId],
    ) as CountRow[];
    await this.dataSource.query(
      `INSERT INTO enrollments (student_id, course_id, group_id, tenant_id, status, enrolled_at, total_lessons, progress_percent, lessons_completed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), $5, 0, 0, NOW(), NOW())`,
      [studentId, courseId, groupId || null, tenantId, parseInt(totalLessons[0].count, 10)],
    );
    if (groupId) {
      await this.dataSource.query(
        `UPDATE groups SET current_count = current_count + 1 WHERE id = $1`, [groupId],
      );
    }
    this.eventEmitter.emit('student.enrolled', { studentId, courseId, groupId, tenantId });
    return { message: 'Student enrolled successfully' };
  }

  async getDebtReport(tenantId: string): Promise<DebtReportItemDto[]> {
    const rows = await this.dataSource.query(
      `SELECT s.id, u.first_name, u.last_name, u.email, u.phone,
              s.debt_amount, s.student_code,
              COUNT(p.id) as overdue_payments
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN payments p ON p.student_id = s.id AND p.status = 'overdue'
       WHERE s.tenant_id = $1 AND s.debt_amount > 0 AND s.deleted_at IS NULL
       GROUP BY s.id, u.first_name, u.last_name, u.email, u.phone, s.debt_amount, s.student_code
       ORDER BY s.debt_amount DESC`,
      [tenantId],
    ) as Array<{ id: string; first_name: string; last_name: string; email: string; phone: string; debt_amount: string; student_code: string; overdue_payments: string }>;

    return rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      debtAmount: parseFloat(r.debt_amount),
      studentCode: r.student_code,
      overduePayments: parseInt(r.overdue_payments, 10),
    }));
  }

  async updatePricing(tenantId: string, courseId: string, dto: UpdatePricingDto): Promise<{ message: string }> {
    await this.dataSource.query(
      `UPDATE courses SET price = $1, currency = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`,
      [dto.price, dto.currency || 'UZS', courseId, tenantId],
    );
    return { message: 'Pricing updated' };
  }

  async bulkSendNotification(tenantId: string, dto: BulkNotificationDto): Promise<{ sent: number }> {
    let userIds: string[] = [];
    if (dto.target === 'all_students') {
      const rows = await this.dataSource.query(
        `SELECT u.id FROM users u JOIN students s ON s.user_id = u.id WHERE s.tenant_id = $1 AND s.deleted_at IS NULL`,
        [tenantId],
      ) as UserRow[];
      userIds = rows.map((r) => r.id);
    } else if (dto.target === 'all_teachers') {
      const rows = await this.dataSource.query(
        `SELECT u.id FROM users u JOIN teachers t ON t.user_id = u.id WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`,
        [tenantId],
      ) as UserRow[];
      userIds = rows.map((r) => r.id);
    } else if (dto.target === 'group' && dto.groupId) {
      const rows = await this.dataSource.query(
        `SELECT u.id FROM users u JOIN students s ON s.user_id = u.id JOIN enrollments e ON e.student_id = s.id WHERE e.group_id = $1 AND e.status = 'active'`,
        [dto.groupId],
      ) as UserRow[];
      userIds = rows.map((r) => r.id);
    }
    for (const userId of userIds) {
      await this.dataSource.query(
        `INSERT INTO notifications (tenant_id, user_id, type, channel, title, body, status, created_at)
         VALUES ($1, $2, 'system', 'in_app', $3, $4, 'pending', NOW())`,
        [tenantId, userId, dto.title, dto.body],
      );
    }
    return { sent: userIds.length };
  }

  async manageGroup(tenantId: string, dto: ManageGroupDto): Promise<{ id: string; message: string }> {
    if (dto.id) {
      await this.dataSource.query(
        `UPDATE groups SET name = COALESCE($1, name), teacher_id = COALESCE($2, teacher_id), max_students = COALESCE($3, max_students), updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5`,
        [dto.name, dto.teacherId, dto.maxStudents, dto.id, tenantId],
      );
      return { id: dto.id, message: 'Group updated' };
    }
    const result = await this.dataSource.query(
      `INSERT INTO groups (tenant_id, course_id, teacher_id, name, max_students, is_active, current_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, 0, NOW(), NOW()) RETURNING id`,
      [tenantId, dto.courseId, dto.teacherId, dto.name, dto.maxStudents || 30],
    ) as Array<{ id: string }>;
    return { id: result[0].id, message: 'Group created' };
  }

  async manageCourse(tenantId: string, dto: ManageCourseDto): Promise<{ message: string; courseId: string }> {
    const courseRows = await this.dataSource.query(
      `SELECT id FROM courses WHERE id = $1 AND tenant_id = $2`,
      [dto.courseId, tenantId],
    ) as Array<{ id: string }>;
    if (!courseRows.length) throw new NotFoundException('Course not found');

    const fields: string[] = [];
    const params: (string | number | CourseStatus)[] = [dto.courseId, tenantId];

    if (dto.teacherId !== undefined) {
      fields.push(`teacher_id = $${params.length + 1}`);
      params.push(dto.teacherId);
    }
    if (dto.price !== undefined) {
      fields.push(`price = $${params.length + 1}`);
      params.push(dto.price);
    }
    if (dto.maxStudents !== undefined) {
      fields.push(`max_students = $${params.length + 1}`);
      params.push(dto.maxStudents);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${params.length + 1}`);
      params.push(dto.status);
    }
    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      await this.dataSource.query(
        `UPDATE courses SET ${fields.join(', ')} WHERE id = $1 AND tenant_id = $2`,
        params,
      );
    }

    this.eventEmitter.emit('audit.action', {
      tenantId,
      action: 'update',
      entityType: 'course',
      entityId: dto.courseId,
      newValue: dto,
    });

    return { message: 'Course updated successfully', courseId: dto.courseId };
  }

  async manageSchedule(tenantId: string, dto: ManageScheduleDto): Promise<{ message: string; id: string }> {
    const groupRows = await this.dataSource.query(
      `SELECT id FROM groups WHERE id = $1 AND tenant_id = $2`,
      [dto.groupId, tenantId],
    ) as Array<{ id: string }>;
    if (!groupRows.length) throw new NotFoundException('Group not found');

    if (dto.id) {
      await this.dataSource.query(
        `UPDATE schedules SET
           group_id = $1, teacher_id = $2, specific_date = $3,
           start_time = $4, end_time = $5, room = COALESCE($6, room), updated_at = NOW()
         WHERE id = $7 AND tenant_id = $8`,
        [dto.groupId, dto.teacherId, dto.date, dto.startTime, dto.endTime, dto.classroom || null, dto.id, tenantId],
      );
      return { message: 'Schedule updated', id: dto.id };
    }

    const result = await this.dataSource.query(
      `INSERT INTO schedules (tenant_id, group_id, teacher_id, course_id, specific_date, start_time, end_time, room, is_cancelled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW()) RETURNING id`,
      [tenantId, dto.groupId, dto.teacherId, dto.courseId || null, dto.date, dto.startTime, dto.endTime, dto.classroom || null],
    ) as Array<{ id: string }>;

    this.eventEmitter.emit('audit.action', {
      tenantId,
      action: 'create',
      entityType: 'schedule',
      entityId: result[0].id,
      newValue: dto,
    });

    return { message: 'Schedule created', id: result[0].id };
  }
}
