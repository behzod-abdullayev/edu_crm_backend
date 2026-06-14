import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';

export interface AnalyticsFilterDto {
  from?: string;
  to?: string;
  groupId?: string;
  courseId?: string;
  groupBy?: string;
}

export interface StudentExportRow {
  code: string;
  name: string;
  email: string;
  courses: number;
  attendance: number;
  grade: number;
  paid: number;
  debt: number;
  status: string;
}

export interface AttendanceExportRow {
  date: string;
  studentName: string;
  groupName: string;
  status: string;
  courseName: string;
}

export interface PaymentExportRow {
  invoiceNumber: string;
  studentName: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  paidAt: string;
}

export interface TeacherExportRow {
  code: string;
  name: string;
  groups: number;
  students: number;
  rating: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private dataSource: DataSource) {}

  async getOverview(tenantId: string, from?: Date, to?: Date): Promise<{
    totalStudents: number;
    totalTeachers: number;
    revenue: number;
    attendanceRate: number;
    newEnrollments: number;
  }> {
    const fromDate = from || new Date(new Date().setDate(1));
    const toDate = to || new Date();
    const [students, teachers, revenue, attendance, enrollments] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
      this.dataSource.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
      this.dataSource.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM payments WHERE tenant_id = $1 AND status='paid' AND paid_at BETWEEN $2 AND $3`, [tenantId, fromDate, toDate]),
      this.dataSource.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendances WHERE tenant_id=$1 AND marked_at BETWEEN $2 AND $3`, [tenantId, fromDate, toDate]),
      this.dataSource.query(`SELECT COUNT(*) FROM enrollments WHERE tenant_id=$1 AND enrolled_at BETWEEN $2 AND $3`, [tenantId, fromDate, toDate]),
    ]);
    const att = attendance[0] as { total: string; present: string };
    return {
      totalStudents: parseInt(students[0].count, 10),
      totalTeachers: parseInt(teachers[0].count, 10),
      revenue: parseFloat(revenue[0].total),
      attendanceRate: parseInt(att.total, 10) > 0 ? Math.round((parseInt(att.present, 10) / parseInt(att.total, 10)) * 100) : 0,
      newEnrollments: parseInt(enrollments[0].count, 10),
    };
  }

  async getPerformance(tenantId: string, studentId?: string, groupId?: string): Promise<{
    gradeTrend: { month: string; average: number }[];
    attendanceTrend: { month: string; rate: number }[];
  }> {
    const gradeTrend: { month: string; average: number }[] = [];
    const attendanceTrend: { month: string; rate: number }[] = [];

    if (!studentId && !groupId) {
      return { gradeTrend, attendanceTrend };
    }

    const filterParam = studentId ?? groupId;
    const gradeFilterSql = studentId ? 'hs.student_id = $1::text' : 'hw.group_id = $1';
    const attendanceFilterSql = studentId ? 'student_id = $1' : 'group_id = $1';

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      const gradeRows = await this.dataSource.query(
        `SELECT AVG(hs.score::numeric) AS avg_score
         FROM homework_submissions hs
         JOIN homeworks hw ON hw.id = hs.homework_id
         WHERE ${gradeFilterSql} AND hw.tenant_id = $2 AND hs.score IS NOT NULL
           AND EXTRACT(YEAR FROM hs.graded_at) = $3 AND EXTRACT(MONTH FROM hs.graded_at) = $4`,
        [filterParam, tenantId, year, month],
      ) as Array<{ avg_score: number | null }>;

      const average =
        gradeRows[0]?.avg_score !== null && gradeRows[0]?.avg_score !== undefined
          ? Math.round(Number(gradeRows[0].avg_score) * 10) / 10
          : 0;
      gradeTrend.push({ month: monthKey, average });

      const attRows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'present')::int AS present_count
         FROM attendance
         WHERE ${attendanceFilterSql} AND tenant_id = $2
           AND EXTRACT(YEAR FROM date) = $3 AND EXTRACT(MONTH FROM date) = $4`,
        [filterParam, tenantId, year, month],
      ) as Array<{ total: string; present_count: string }>;

      const total = Number(attRows[0]?.total ?? 0);
      const present = Number(attRows[0]?.present_count ?? 0);
      const rate = total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0;
      attendanceTrend.push({ month: monthKey, rate });
    }

    return { gradeTrend, attendanceTrend };
  }

  async getStudentAnalytics(tenantId: string, filters: AnalyticsFilterDto): Promise<{
    topStudents: unknown[];
    atRisk: unknown[];
    progressDistribution: unknown[];
  }> {
    const [topStudents, atRisk, progressDist] = await Promise.all([
      this.dataSource.query(
        `SELECT u.first_name, u.last_name, s.student_code,
                AVG(er.total_score) as avg_score, COUNT(er.id) as exams_taken
         FROM students s JOIN users u ON u.id = s.user_id
         LEFT JOIN exam_results er ON er.student_id = s.id
         WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
         GROUP BY s.id, u.first_name, u.last_name, s.student_code
         ORDER BY avg_score DESC NULLS LAST LIMIT 10`, [tenantId],
      ),
      this.dataSource.query(
        `SELECT u.first_name, u.last_name, s.student_code, s.debt_amount,
                COUNT(a.id) as absences
         FROM students s JOIN users u ON u.id = s.user_id
         LEFT JOIN attendances a ON a.student_id = s.id AND a.status = 'absent'
         WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
         GROUP BY s.id, u.first_name, u.last_name, s.student_code, s.debt_amount
         HAVING COUNT(a.id) > 3 OR s.debt_amount > 0
         ORDER BY s.debt_amount DESC, absences DESC LIMIT 10`, [tenantId],
      ),
      this.dataSource.query(
        `SELECT CASE WHEN progress_percent < 25 THEN '0-25%' WHEN progress_percent < 50 THEN '25-50%' WHEN progress_percent < 75 THEN '50-75%' ELSE '75-100%' END as range, COUNT(*) FROM enrollments WHERE tenant_id=$1 AND status='active' GROUP BY range`, [tenantId],
      ),
    ]);
    return { topStudents, atRisk, progressDistribution: progressDist };
  }

  async getAttendanceAnalytics(tenantId: string, filters: AnalyticsFilterDto): Promise<{
    timeline: unknown[];
    byGroup: unknown[];
  }> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = filters.to ? new Date(filters.to) : new Date();
    const trunc = filters.groupBy === 'week' ? 'week' : filters.groupBy === 'month' ? 'month' : 'day';

    const [timeline, byGroup] = await Promise.all([
      this.dataSource.query(
        `SELECT DATE_TRUNC($1, marked_at) as period,
                COUNT(*) as total,
                SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
         FROM attendances WHERE tenant_id=$2 AND marked_at BETWEEN $3 AND $4
         GROUP BY DATE_TRUNC($1, marked_at) ORDER BY period`, [trunc, tenantId, fromDate, toDate],
      ),
      this.dataSource.query(
        `SELECT g.name as group_name, COUNT(a.id) as total, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present
         FROM attendances a JOIN groups g ON g.id = a.group_id WHERE a.tenant_id=$1 AND a.marked_at BETWEEN $2 AND $3
         GROUP BY g.name ORDER BY present DESC`, [tenantId, fromDate, toDate],
      ),
    ]);
    return { timeline, byGroup };
  }

  async getFinancialAnalytics(tenantId: string, filters: AnalyticsFilterDto): Promise<{
    revenueTimeline: unknown[];
    byMethod: unknown[];
    overdue: unknown;
    topPayers: unknown[];
  }> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const toDate = filters.to ? new Date(filters.to) : new Date();

    const [revenue, byMethod, overdue, topPayers] = await Promise.all([
      this.dataSource.query(
        `SELECT DATE_TRUNC('day', paid_at) as date, SUM(total_amount) as amount, COUNT(*) as count FROM payments WHERE tenant_id=$1 AND status='paid' AND paid_at BETWEEN $2 AND $3 GROUP BY DATE_TRUNC('day', paid_at) ORDER BY date`, [tenantId, fromDate, toDate],
      ),
      this.dataSource.query(`SELECT method, COUNT(*), SUM(total_amount) as total FROM payments WHERE tenant_id=$1 AND status='paid' AND paid_at BETWEEN $2 AND $3 GROUP BY method`, [tenantId, fromDate, toDate]),
      this.dataSource.query(`SELECT COUNT(*), SUM(total_amount) as total FROM payments WHERE tenant_id=$1 AND status='overdue'`, [tenantId]),
      this.dataSource.query(
        `SELECT u.first_name, u.last_name, SUM(p.total_amount) as total_paid FROM payments p JOIN students s ON s.id=p.student_id JOIN users u ON u.id=s.user_id WHERE p.tenant_id=$1 AND p.status='paid' AND p.paid_at BETWEEN $2 AND $3 GROUP BY u.first_name, u.last_name ORDER BY total_paid DESC LIMIT 10`, [tenantId, fromDate, toDate],
      ),
    ]);
    return { revenueTimeline: revenue, byMethod, overdue: overdue[0], topPayers };
  }

  async getCourseAnalytics(tenantId: string, courseId?: string): Promise<{ courses: unknown[] }> {
    let where = `c.tenant_id = $1`;
    const params: (string | undefined)[] = [tenantId];
    if (courseId) { where += ` AND c.id = $2`; params.push(courseId); }

    const courses = await this.dataSource.query(
      `SELECT c.id, c.title, c.status,
              COUNT(DISTINCT e.id) as enrollments,
              COUNT(DISTINCT CASE WHEN e.status='completed' THEN e.id END) as completions,
              AVG(e.progress_percent) as avg_progress,
              COUNT(DISTINCT CASE WHEN e.status='dropped' THEN e.id END) as drops
       FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE ${where} AND c.deleted_at IS NULL
       GROUP BY c.id, c.title, c.status ORDER BY enrollments DESC`, params,
    );
    return { courses };
  }

  async getTeacherAnalytics(tenantId: string, teacherId?: string): Promise<{ teachers: unknown[] }> {
    let where = `t.tenant_id = $1 AND t.deleted_at IS NULL`;
    const params: (string | undefined)[] = [tenantId];
    if (teacherId) { where += ` AND t.id = $2`; params.push(teacherId); }

    const teachers = await this.dataSource.query(
      `SELECT t.id, t.teacher_code, u.first_name, u.last_name,
              COUNT(DISTINCT g.id) as group_count,
              COUNT(DISTINCT e.id) as student_count,
              t.rating
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN groups g ON g.teacher_id = t.id AND g.deleted_at IS NULL
       LEFT JOIN enrollments e ON e.group_id = g.id AND e.status='active'
       WHERE ${where}
       GROUP BY t.id, t.teacher_code, u.first_name, u.last_name, t.rating`, params,
    );
    return { teachers };
  }

  async getStudentsForExport(tenantId: string, _filters: AnalyticsFilterDto): Promise<StudentExportRow[]> {
    const rows = await this.dataSource.query(
      `SELECT s.student_code as code,
              CONCAT(u.first_name, ' ', u.last_name) as name,
              u.email,
              COUNT(DISTINCT e.id) as courses,
              COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0)), 0) as attendance,
              COALESCE(AVG(er.total_score), 0) as grade,
              s.total_paid as paid,
              s.debt_amount as debt,
              s.status
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'active'
       LEFT JOIN attendances a ON a.student_id = s.id
       LEFT JOIN exam_results er ON er.student_id = s.id
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
       GROUP BY s.id, s.student_code, u.first_name, u.last_name, u.email, s.total_paid, s.debt_amount, s.status
       ORDER BY name`, [tenantId],
    );
    return rows as StudentExportRow[];
  }

  async getAttendanceForExport(tenantId: string, filters: AnalyticsFilterDto): Promise<AttendanceExportRow[]> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = filters.to ? new Date(filters.to) : new Date();
    const rows = await this.dataSource.query(
      `SELECT a.marked_at::date as date,
              CONCAT(u.first_name, ' ', u.last_name) as "studentName",
              g.name as "groupName",
              a.status,
              c.title as "courseName"
       FROM attendances a
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.user_id
       JOIN groups g ON g.id = a.group_id
       JOIN courses c ON c.id = g.course_id
       WHERE a.tenant_id = $1 AND a.marked_at BETWEEN $2 AND $3
       ORDER BY a.marked_at DESC`, [tenantId, fromDate, toDate],
    );
    return rows as AttendanceExportRow[];
  }

  async getPaymentsForExport(tenantId: string, filters: AnalyticsFilterDto): Promise<PaymentExportRow[]> {
    const fromDate = filters.from ? new Date(filters.from) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const toDate = filters.to ? new Date(filters.to) : new Date();
    const rows = await this.dataSource.query(
      `SELECT p.invoice_number as "invoiceNumber",
              CONCAT(u.first_name, ' ', u.last_name) as "studentName",
              p.total_amount as amount,
              p.currency,
              p.status,
              p.payment_method as method,
              p.paid_at as "paidAt"
       FROM payments p
       JOIN students s ON s.id = p.student_id
       JOIN users u ON u.id = s.user_id
       WHERE p.tenant_id = $1 AND p.created_at BETWEEN $2 AND $3
       ORDER BY p.created_at DESC`, [tenantId, fromDate, toDate],
    );
    return rows as PaymentExportRow[];
  }

  async getTeachersForExport(tenantId: string, _filters: AnalyticsFilterDto): Promise<TeacherExportRow[]> {
    const rows = await this.dataSource.query(
      `SELECT t.teacher_code as code,
              CONCAT(u.first_name, ' ', u.last_name) as name,
              COUNT(DISTINCT g.id) as groups,
              COUNT(DISTINCT e.id) as students,
              COALESCE(t.rating, 0) as rating
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN groups g ON g.teacher_id = t.id AND g.deleted_at IS NULL
       LEFT JOIN enrollments e ON e.group_id = g.id AND e.status = 'active'
       WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       GROUP BY t.id, t.teacher_code, u.first_name, u.last_name, t.rating
       ORDER BY name`, [tenantId],
    );
    return rows as TeacherExportRow[];
  }

  async exportToExcel(
    tenantId: string,
    type: 'students' | 'attendance' | 'payments' | 'teachers',
    filters: AnalyticsFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EduCRM';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(type.toUpperCase());

    if (type === 'students') {
      sheet.columns = [
        { header: 'Student Code', key: 'code', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Enrolled Courses', key: 'courses', width: 20 },
        { header: 'Attendance %', key: 'attendance', width: 15 },
        { header: 'Avg Grade', key: 'grade', width: 12 },
        { header: 'Total Paid', key: 'paid', width: 15 },
        { header: 'Debt', key: 'debt', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ];
      const data = await this.getStudentsForExport(tenantId, filters);
      data.forEach((row) => sheet.addRow(row));
    } else if (type === 'attendance') {
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Group', key: 'groupName', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Course', key: 'courseName', width: 25 },
      ];
      const data = await this.getAttendanceForExport(tenantId, filters);
      data.forEach((row) => sheet.addRow(row));
    } else if (type === 'payments') {
      sheet.columns = [
        { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
        { header: 'Student Name', key: 'studentName', width: 25 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Method', key: 'method', width: 15 },
        { header: 'Paid At', key: 'paidAt', width: 20 },
      ];
      const data = await this.getPaymentsForExport(tenantId, filters);
      data.forEach((row) => sheet.addRow(row));
    } else if (type === 'teachers') {
      sheet.columns = [
        { header: 'Teacher Code', key: 'code', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Groups', key: 'groups', width: 12 },
        { header: 'Students', key: 'students', width: 12 },
        { header: 'Rating', key: 'rating', width: 10 },
      ];
      const data = await this.getTeachersForExport(tenantId, filters);
      data.forEach((row) => sheet.addRow(row));
    }

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF185FA5' },
    };

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async exportToCsv(
    tenantId: string,
    type: 'students' | 'attendance' | 'payments' | 'teachers',
    filters: AnalyticsFilterDto,
  ): Promise<string> {
    let rows: Record<string, unknown>[] = [];

    if (type === 'students') rows = await this.getStudentsForExport(tenantId, filters) as unknown as Record<string, unknown>[];
    else if (type === 'attendance') rows = await this.getAttendanceForExport(tenantId, filters) as unknown as Record<string, unknown>[];
    else if (type === 'payments') rows = await this.getPaymentsForExport(tenantId, filters) as unknown as Record<string, unknown>[];
    else if (type === 'teachers') rows = await this.getTeachersForExport(tenantId, filters) as unknown as Record<string, unknown>[];

    if (!rows.length) return '';

    const headers = Object.keys(rows[0]).join(',');
    const lines = rows.map((r) =>
      Object.values(r).map((v) => {
        const str = v === null || v === undefined ? '' : String(v);
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','),
    );
    return [headers, ...lines].join('\n');
  }
}
