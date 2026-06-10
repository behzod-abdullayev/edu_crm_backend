import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserManagementFilterDto } from './dto/user-management.dto';
import { OwnerInviteUserDto } from './dto/invite-user.dto';
import { HrOperationDto } from './dto/hr-operation.dto';
import { SystemConfigDto } from './dto/system-config.dto';
import { ManageBranchDto } from './dto/manage-branch.dto';
import { UserRole, UserStatus, Permission } from '../../shared/enums';
import { BranchResponseDto } from './dto/branch-response.dto';
import {
  GlobalAnalyticsDto, RevenueByMonthDto, StudentGrowthDto, TopCourseDto,
  BranchComparisonDto, UserGrowthPointDto,
} from './dto/global-analytics.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { OwnerCreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { OwnerAssignRoleDto } from './dto/assign-role.dto';
import { RolesService } from '../roles/roles.service';

export interface UserRow {
  id: string;
  // TypeORM synchronize:true created "firstName"/"lastName" columns (camelCase, no name mapping).
  // Raw SQL must use quoted identifiers to match the actual column names in PostgreSQL.
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
  branch: string;
  // metadata JSONB - salary, contractStatus, hireDate kabi HR ma'lumotlari
  metadata?: Record<string, unknown> | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

// FIX: GlobalDashboardKpis interfeysi kengaytirildi — totalBranches, activeCourses,
// monthlyEnrollments, mrr, arr, trends fieldlari qo'shildi.
// Bu frontend GlobalKPIDashboard komponentidagi "Branches: 0" muammosini hal qiladi.
export interface GlobalDashboardKpis {
  // Legacy fields (eski frontendlar uchun)
  monthlyRevenue: number;
  activeStudents: number;
  teacherCount: number;
  attendanceRate: number;
  completionRate: number;
  // NEW: GlobalKPIDashboard komponentiga kerakli fieldlar
  mrr: number;
  arr: number;
  totalUsers: number;
  totalBranches: number;
  activeCourses: number;
  monthlyEnrollments: number;
  revenueGrowthPercent: number;
  trends: {
    mrrChange: number;
    usersChange: number;
    enrollmentsChange: number;
  };
}

interface RoleRow { permissions: string; name: string; }
interface UserBasicRow { id: string; role: string; }
interface CountRow { count: string; }
interface RevenueRow { mrr: string; }
interface AttendanceRow { total: string; present: string; }
interface CompletionRow { rate: string; }
export interface RevenueTimelineRow { date: Date; amount: string; count: string; }
export interface PaymentMethodRow { method: string; count: string; total: string; }
export interface PendingRow { count: string; total: string; }
export interface BranchRow { branches: BranchDto[] | null | string; }
export interface TenantRow {
  name: string; slug: string; domain: string; timezone: string;
  default_language: string; currency: string; feature_flags: Record<string, boolean>;
  branches: BranchDto[] | null | string; subscription_plan: string; max_students: number; max_teachers: number;
}
export interface AuditLogRow { [key: string]: unknown; }
interface AuditCountRow { count: string; }
interface ExportStudentRow { [key: string]: unknown; }
interface MonthlyRevenueRow { total: string; }
interface MonthlyCountRow { count: string; }
interface MonthlyAttRow { total: string; present: string; }
interface TopCourseRow { courseid: string; name: string; enrollmentcount: string; revenue: string; }
interface PrevMonthRevenueRow { total: string; }

// ── Financial analytics row shapes ─────────────────────────────────────────
interface TenantCurrencyRow { currency: string; branches: BranchDto[] | null | string; }
interface AmountTotalRow { total: string; }
interface BranchIncomeRow { branch: string | null; income: string; }
interface BranchExpenseRow { branch: string | null; expenses: string; }
interface BranchStudentCountRow { branch: string | null; count: string; }
interface BranchRevenueRow { branch: string | null; revenue: string; }
interface BranchAttendanceRow { branch: string | null; total: string; present: string; }
interface CourseFinanceRow { id: string; title: string; currency: string; teacherId: string | null; income: string; }
interface TeacherSalaryRow { id: string; salary: string | null; }
interface StudentFinanceRow {
  studentId: string; firstName: string; lastName: string; branch: string | null;
  inflow: string; outflow: string;
}

export interface FinancialBranchBreakdown {
  branchName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface FinancialCourseBreakdown {
  courseId: string;
  courseName: string;
  income: number;
  expenses: number;
  netProfit: number;
  currency: string;
}

export interface FinancialStudentBreakdown {
  studentId: string;
  studentName: string;
  branch: string | null;
  inflow: number;
  outflow: number;
  netProfit: number;
  currency: string;
}

export interface FinancialOverviewResult {
  currency: string;
  mrr: number;
  arr: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueTotal: number;
  revenueTimeline: RevenueTimelineRow[];
  revenueByBranch: FinancialBranchBreakdown[];
  paymentMethodBreakdown: { method: string; amount: number; percent: number }[];
  topStudents: { studentId: string; studentName: string; totalPaid: number; currency: string }[];
  courseBreakdown: FinancialCourseBreakdown[];
  studentBreakdown: FinancialStudentBreakdown[];
}

export interface BranchDto { id: string; [key: string]: unknown; }

// Helper: tenant.branches JSONB ni parse qilish
// TypeORM raw SQL ba'zan JSONB ni string sifatida qaytaradi
function parseBranchesJson(raw: BranchDto[] | null | string | undefined): BranchDto[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as BranchDto[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Helper: users.branch / students.branch ko'pincha NULL bo'ladi (filial
// tayinlash UI orqali saqlanmagan). HR paneli bilan bir xil mantiq:
// NULL filial — tenant.branches ichidagi isMain:true filialga tegishli deb
// hisoblanadi (yo'q bo'lsa — birinchi filial, hech qanday filial bo'lmasa
// 'Unassigned').
function buildBranchResolver(branches: BranchDto[]): (branch: string | null) => string {
  const mainBranch = branches.find((b) => b.isMain === true) ?? branches[0];
  const fallbackName = typeof mainBranch?.name === 'string' ? mainBranch.name : null;
  return (branch: string | null) => branch ?? fallbackName ?? 'Unassigned';
}

@Injectable()
export class OwnerService {
  constructor(
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private rolesService: RolesService,
  ) {}

  async getUserManagement(tenantId: string, filters: UserManagementFilterDto): Promise<PaginatedResult<UserRow>> {
    const { search, role, status, page = 1, limit = 20, sortBy, order } = filters;

    // BUG FIX: countQuery ham xuddi main query kabi filterlarni qo'llashi kerak.
    // Avvalgi versiyada countQuery faqat tenant_id tekshirardi (search/role/status yo'q).
    // Natijada role=student bilan so'ralganda:
    //   - data: 6 student (to'g'ri)
    //   - meta.total: 11 (barcha users — XATO) → totalPages=2, 2-sahifa bo'sh
    // Yechim: filter WHERE shartlarini countParams bilan countQuery ga ham qo'shamiz.

    // ── Shared WHERE conditions (filters applied to both count and data queries) ──
    const whereConditions: string[] = [
      'u.tenant_id = $1',
      'u.deleted_at IS NULL',
    ];
    const filterParams: (string | number)[] = [tenantId];

    if (search) {
      const idx = filterParams.length + 1;
      whereConditions.push(
        `(u."firstName" ILIKE $${idx} OR u."lastName" ILIKE $${idx} OR u.email ILIKE $${idx})`,
      );
      filterParams.push(`%${search}%`);
    }
    if (role) {
      whereConditions.push(`u.role = $${filterParams.length + 1}`);
      filterParams.push(role);
    }
    if (status) {
      whereConditions.push(`u.status = $${filterParams.length + 1}`);
      filterParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    // ── COUNT query (with same filters) ──────────────────────────────────────
    const countQuery = `SELECT COUNT(*) FROM users u WHERE ${whereClause}`;
    const countResult = await this.dataSource.query(countQuery, filterParams) as CountRow[];
    const total = parseInt(countResult[0]?.count || '0', 10);

    // ── ORDER BY (sortBy/order) ────────────────────────────────────────────────
    // FIX: frontend DataTable orqali yuboriladigan sortBy/order endi qo'llab-quvvatlanadi.
    // Raw SQL bo'lgani uchun sortBy ustun nomi allowlist orqali tekshiriladi (SQL injection oldini olish).
    const SORTABLE_COLUMNS: Record<string, string> = {
      createdAt: 'u.created_at',
      name:      'u."firstName"',
      firstName: 'u."firstName"',
      lastName:  'u."lastName"',
      email:     'u.email',
      role:      'u.role',
      status:    'u.status',
      lastLogin: 'u.last_login_at',
    };
    const orderColumn = SORTABLE_COLUMNS[sortBy ?? ''] ?? 'u.created_at';
    const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';

    // ── DATA query (with pagination on top of filters) ────────────────────────
    const dataParams: (string | number)[] = [...filterParams, limit, (page - 1) * limit];
    const dataQuery = `
      SELECT u.id, u."firstName", u."lastName", u.email, u.phone, u.role, u.status,
             u.last_login_at, u.created_at, u.branch, u.metadata
      FROM users u
      WHERE ${whereClause}
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
    `;
    const users = await this.dataSource.query(dataQuery, dataParams) as UserRow[];

    return { data: users, meta: { total, page, limit } };
  }

  async manageRoles(tenantId: string, dto: { userId: string; roleId: string; action: string }): Promise<{ message: string }> {
    const { userId, roleId, action } = dto;
    if (action === 'assign') {
      const role = await this.dataSource.query(
        `SELECT permissions, name FROM custom_roles WHERE id = $1 AND tenant_id = $2`,
        [roleId, tenantId],
      ) as RoleRow[];
      if (!role.length) throw new NotFoundException('Role not found');
      await this.dataSource.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [role[0].name, userId, tenantId],
      );
      this.eventEmitter.emit('audit.action', { tenantId, action: 'role_change', entityId: userId, newValue: dto });
      return { message: 'Role assigned' };
    }
    throw new BadRequestException('Invalid action');
  }

  async hrOperations(tenantId: string, dto: HrOperationDto): Promise<{ message: string }> {
    const { userId, operation, newRole, reason } = dto;
    const user = await this.dataSource.query(
      `SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    ) as UserBasicRow[];
    if (!user.length) throw new NotFoundException('User not found');

    if (operation === 'hire') {
      await this.dataSource.query(`UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1`, [userId]);
    } else if (operation === 'fire') {
      await this.dataSource.query(`UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [userId]);
    } else if (operation === 'change_role' && newRole) {
      await this.dataSource.query(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, [newRole, userId]);
    } else if (operation === 'update_salary') {
      // Maoshni metadata JSONB ichida saqlaymiz (users jadvalida alohida salary column yo'q)
      // jsonb_set: mavjud metadata ni saqlab, faqat salary ni yangilaymiz
      const { salary } = dto;
      if (salary === undefined || salary === null) {
        throw new BadRequestException('salary field is required for update_salary operation');
      }
      await this.dataSource.query(
        `UPDATE users
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{salary}',
           $1::jsonb
         ),
         updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [salary.toString(), userId, tenantId],
      );
    } else {
      throw new BadRequestException('Invalid HR operation');
    }

    this.eventEmitter.emit('audit.action', { tenantId, action: 'role_change', entityId: userId, newValue: { operation, newRole, reason } });
    return { message: `HR operation '${operation}' applied successfully` };
  }

  // FIX: getGlobalDashboard kengaytirildi.
  // Muammo: avvalgi versiya faqat { monthlyRevenue, activeStudents, teacherCount,
  // attendanceRate, completionRate } qaytargan. Frontend GlobalKPIDashboard komponentiga
  // totalBranches, activeCourses, monthlyEnrollments, mrr, arr, trends kerak edi.
  // Natijada dashboard da "Branches: 0" va "Active Courses: 0" ko'rinardi,
  // garchi Filiallar sahifasida real filiallar bor bo'lsa ham.
  //
  // Tuzatish: barcha kerakli KPI fieldlar bitta Promise.all da parallel olinadi.
  // totalBranches → tenant.branches JSONB massivi uzunligi
  // activeCourses → courses jadvalidagi faol kurslar soni
  // monthlyEnrollments → joriy oydagi yangi ro'yxatdan o'tganlar soni
  // mrr = monthlyRevenue (bir xil qiymat, ikki nom)
  // arr = mrr * 12
  // trends → o'tgan oyga nisbatan foiz o'zgarish
  async getGlobalDashboard(tenantId: string): Promise<{ kpis: GlobalDashboardKpis }> {
    const [
      students,
      teachers,
      revenue,
      attendance,
      completionRate,
      activeCourses,
      monthlyEnrollments,
      tenantBranches,
      prevMonthRevenue,
      allUsers,
    ] = await Promise.all([
      // Jami faol o'quvchilar
      this.dataSource.query(
        `SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      ) as Promise<CountRow[]>,

      // Jami o'qituvchilar
      this.dataSource.query(
        `SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      ) as Promise<CountRow[]>,

      // Joriy oy daromadi (MRR)
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as mrr
         FROM payments
         WHERE tenant_id = $1
           AND status = 'paid'
           AND paid_at >= DATE_TRUNC('month', NOW())`,
        [tenantId],
      ) as Promise<RevenueRow[]>,

      // So'nggi 30 kunlik davomiylik
      this.dataSource.query(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
         FROM attendance
         WHERE tenant_id = $1
           AND date >= (CURRENT_DATE - INTERVAL '30 days')`,
        [tenantId],
      ) as Promise<AttendanceRow[]>,

      // Kurs yakunlanish foizi
      this.dataSource.query(
        `SELECT AVG(progress_percent) as rate
         FROM enrollments
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId],
      ) as Promise<CompletionRow[]>,

      // FIX: Faol kurslar soni
      this.dataSource.query(
        `SELECT COUNT(*) FROM courses WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      ) as Promise<CountRow[]>,

      // FIX: Joriy oydagi yangi ro'yxatdan o'tganlar soni
      this.dataSource.query(
        `SELECT COUNT(*) FROM enrollments
         WHERE tenant_id = $1
           AND created_at >= DATE_TRUNC('month', NOW())`,
        [tenantId],
      ) as Promise<CountRow[]>,

      // FIX: Filiallar sonini tenant.branches JSONB dan olish
      // (alohida branches jadval yo'q — filiallar tenant da JSONB sifatida saqlanadi)
      this.dataSource.query(
        `SELECT branches FROM tenants WHERE id = $1`,
        [tenantId],
      ) as Promise<BranchRow[]>,

      // O'tgan oy daromadi (trend hisoblash uchun)
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total
         FROM payments
         WHERE tenant_id = $1
           AND status = 'paid'
           AND paid_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
           AND paid_at < DATE_TRUNC('month', NOW())`,
        [tenantId],
      ) as Promise<PrevMonthRevenueRow[]>,

      // FIX: Jami foydalanuvchilar soni — users jadvalidan to'g'ridan-to'g'ri
      // (students + teachers yig'indisi emas — admin, owner rollarini o'tkazib yuboradi)
      this.dataSource.query(
        `SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      ) as Promise<CountRow[]>,
    ]);

    const att = attendance[0];
    const mrrValue = parseFloat(revenue[0]?.mrr ?? '0');
    const prevMrrValue = parseFloat(prevMonthRevenue[0]?.total ?? '0');

    // MRR foiz o'zgarishi (o'tgan oyga nisbatan)
    const mrrChange =
      prevMrrValue > 0
        ? Math.round(((mrrValue - prevMrrValue) / prevMrrValue) * 100 * 10) / 10
        : 0;

    // Filiallar soni: tenant.branches JSONB massivi
    const rawBranchesData = tenantBranches[0]?.branches;
    const branchList = parseBranchesJson(
      rawBranchesData as BranchDto[] | null | string | undefined,
    );
    const totalBranches = branchList.length;

    // Jami foydalanuvchilar soni
    const totalStudents = parseInt(students[0]?.count ?? '0', 10);
    const totalTeachers = parseInt(teachers[0]?.count ?? '0', 10);
    // FIX: users jadvalidan to'g'ridan-to'g'ri — admin, owner rollarini ham hisoblaydi
    const totalUsers = parseInt(allUsers[0]?.count ?? '0', 10);

    return {
      kpis: {
        // Legacy fields
        monthlyRevenue: mrrValue,
        activeStudents:  totalStudents,
        teacherCount:    totalTeachers,
        attendanceRate:
          parseInt(att?.total ?? '0', 10) > 0
            ? Math.round(
                (parseInt(att?.present ?? '0', 10) /
                  parseInt(att?.total ?? '1', 10)) *
                  100,
              )
            : 0,
        completionRate: Math.round(
          parseFloat(completionRate[0]?.rate ?? '0') || 0,
        ),

        // NEW: GlobalKPIDashboard komponentiga kerakli fieldlar
        mrr:                mrrValue,
        arr:                mrrValue * 12,
        totalUsers,
        totalBranches,                                          // ← BU FIELD MUAMMO UCHUN ASOSIY FIX
        activeCourses:      parseInt(activeCourses[0]?.count ?? '0', 10),
        monthlyEnrollments: parseInt(monthlyEnrollments[0]?.count ?? '0', 10),
        revenueGrowthPercent: mrrChange,
        trends: {
          mrrChange,
          usersChange:        0,   // Foydalanuvchi o'sishini hisoblash murakkab — 0 safe default
          enrollmentsChange:  0,   // Enrollment o'sishini hisoblash murakkab — 0 safe default
        },
      },
    };
  }

  // FIX: Finances dashboard avval database modullaridan butunlay uzilgan edi —
  // backend faqat { revenueTimeline, byMethod, pending } qaytarardi, frontend esa
  // FinancialOverview shaklini kutardi (mrr/totalPaid/...), shuning uchun
  // Total Income va Total Expenses doim 0 ko'rinardi.
  //
  // Endi bu metod to'liq FinancialOverviewResult ni qaytaradi:
  //  - totalIncome  = jami to'langan to'lovlar (payments.status='paid')
  //  - totalExpenses = faol xodimlar (teacher/admin) oylik maoshlari yig'indisi
  //                    (users.metadata->salary, HR panelidagi bilan bir xil manba)
  //  - netProfit    = totalIncome - totalExpenses (qat'iy formula)
  //  - currency     = tenants.currency (unified, default 'UZS')
  //  - revenueByBranch / courseBreakdown / studentBreakdown — chuqur tahlil
  //    (cash inflow/outflow har bir student, course va branch (filial) bo'yicha)
  async getFinancialAnalytics(tenantId: string, period: string): Promise<FinancialOverviewResult> {
    const intervals: Record<string, string> = { month: '30 days', quarter: '90 days', year: '365 days' };
    const interval = intervals[period] || '30 days';

    const [
      tenantRows,
      revenueTimeline,
      byMethod,
      pending,
      overdue,
      totalPaidRow,
      mrrRow,
      expensesRow,
      branchIncomeRows,
      branchExpenseRows,
      courseRows,
      teacherSalaryRows,
      studentRows,
    ] = await Promise.all([
      // Tenant currency + branches (for unified currency display & branch breakdown)
      this.dataSource.query(
        `SELECT currency, branches FROM tenants WHERE id = $1`,
        [tenantId],
      ) as Promise<TenantCurrencyRow[]>,

      // Revenue timeline (kunlik daromad grafigi uchun)
      this.dataSource.query(
        `SELECT DATE_TRUNC('day', paid_at) as date, SUM(total_amount) as amount, COUNT(*) as count
         FROM payments WHERE tenant_id = $1 AND status='paid' AND paid_at >= NOW() - INTERVAL '${interval}'
         GROUP BY DATE_TRUNC('day', paid_at) ORDER BY date`,
        [tenantId],
      ) as Promise<RevenueTimelineRow[]>,

      // To'lov usullari bo'yicha taqsimot
      this.dataSource.query(
        `SELECT payment_method as method, COUNT(*), SUM(total_amount) as total FROM payments WHERE tenant_id = $1 AND status='paid' AND paid_at >= NOW() - INTERVAL '${interval}' GROUP BY payment_method`,
        [tenantId],
      ) as Promise<PaymentMethodRow[]>,

      // Kutilayotgan to'lovlar (pending + overdue)
      this.dataSource.query(
        `SELECT COUNT(*), COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status IN ('pending','overdue')`,
        [tenantId],
      ) as Promise<PendingRow[]>,

      // Muddati o'tgan to'lovlar
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'overdue'`,
        [tenantId],
      ) as Promise<AmountTotalRow[]>,

      // BUG #2 FIX: Total Income — barcha to'langan to'lovlar yig'indisi
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid'`,
        [tenantId],
      ) as Promise<AmountTotalRow[]>,

      // MRR — joriy oy daromadi (getGlobalDashboard bilan bir xil mantiq)
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments
         WHERE tenant_id = $1 AND status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW())`,
        [tenantId],
      ) as Promise<AmountTotalRow[]>,

      // BUG #1 FIX: Total Expenses — faol teacher/admin xodimlarning oylik maoshlari
      // (HR paneldagi "Monthly Payroll" bilan bir xil manba: users.metadata->salary)
      this.dataSource.query(
        `SELECT COALESCE(SUM((metadata->>'salary')::numeric), 0) as total
         FROM users
         WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'
           AND role IN ('teacher','admin') AND metadata ? 'salary'`,
        [tenantId],
      ) as Promise<AmountTotalRow[]>,

      // BUG #4/#9 FIX: Branch (filial) bo'yicha cash INFLOW — to'lovlar studentning filiali bo'yicha guruhlanadi
      // (s.branch NULL bo'lsa ham saqlanadi — yagona filial fallback resolveBranchName() da qo'llanadi)
      this.dataSource.query(
        `SELECT s.branch as branch, COALESCE(SUM(p.total_amount), 0) as income
         FROM payments p
         JOIN students s ON s.id = p.student_id
         WHERE p.tenant_id = $1 AND p.status = 'paid'
         GROUP BY s.branch`,
        [tenantId],
      ) as Promise<BranchIncomeRow[]>,

      // BUG #4/#9 FIX: Branch (filial) bo'yicha cash OUTFLOW — xodim maoshlari filial bo'yicha guruhlanadi
      // (branch NULL bo'lsa ham saqlanadi — yagona filial fallback resolveBranchName() da qo'llanadi)
      this.dataSource.query(
        `SELECT branch as branch, COALESCE(SUM((metadata->>'salary')::numeric), 0) as expenses
         FROM users
         WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'
           AND role IN ('teacher','admin') AND metadata ? 'salary'
         GROUP BY branch`,
        [tenantId],
      ) as Promise<BranchExpenseRow[]>,

      // BUG #4 FIX: Course (kurs) bo'yicha cash INFLOW — kursga tegishli to'langan to'lovlar
      this.dataSource.query(
        `SELECT c.id, c.title, c.currency, c.teacher_id as "teacherId",
                COALESCE(SUM(p.total_amount) FILTER (WHERE p.status = 'paid'), 0) as income
         FROM courses c
         LEFT JOIN payments p ON p.course_id = c.id AND p.tenant_id = $1
         WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
         GROUP BY c.id, c.title, c.currency, c.teacher_id`,
        [tenantId],
      ) as Promise<CourseFinanceRow[]>,

      // Course OUTFLOW uchun — kursga biriktirilgan o'qituvchining maoshi
      this.dataSource.query(
        `SELECT id, metadata->>'salary' as salary FROM users WHERE tenant_id = $1 AND role IN ('teacher','admin') AND deleted_at IS NULL`,
        [tenantId],
      ) as Promise<TeacherSalaryRow[]>,

      // BUG #4 FIX: Student (talaba) bo'yicha cash INFLOW (to'langan) / OUTFLOW (qaytarilgan)
      this.dataSource.query(
        `SELECT s.id as "studentId", u."firstName" as "firstName", u."lastName" as "lastName", s.branch,
                COALESCE(SUM(p.total_amount) FILTER (WHERE p.status = 'paid'), 0) as inflow,
                COALESCE(SUM(p.refunded_amount), 0) as outflow
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN payments p ON p.student_id = s.id AND p.tenant_id = $1
         WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
         GROUP BY s.id, u."firstName", u."lastName", s.branch
         ORDER BY inflow DESC
         LIMIT 20`,
        [tenantId],
      ) as Promise<StudentFinanceRow[]>,
    ]);

    const currency = tenantRows[0]?.currency || 'UZS';

    // ── Top-level totals ────────────────────────────────────────────────────
    const totalIncome = parseFloat(totalPaidRow[0]?.total ?? '0') || 0;
    const totalExpenses = parseFloat(expensesRow[0]?.total ?? '0') || 0;
    // BUG #4 FIX (Net Profit formula): strictly Total Income - Total Expenses
    const netProfit = totalIncome - totalExpenses;
    const mrr = parseFloat(mrrRow[0]?.total ?? '0') || 0;

    // ── Per-branch breakdown (cash inflow/outflow per Filial) ──────────────
    // BUG #9 FIX: users.branch / students.branch ko'pincha NULL bo'ladi (filial
    // tayinlash UI orqali saqlanmagan), shuning uchun bu yozuvlar 'Unassigned'
    // ostida to'planib qolardi. HR paneli bilan bir xil mantiq qo'llanadi:
    // NULL filial — tenant.branches ichidagi isMain:true filialga tegishli
    // deb hisoblanadi (yo'q bo'lsa — birinchi filial).
    const tenantBranchList = parseBranchesJson(tenantRows[0]?.branches);
    const resolveBranchName = buildBranchResolver(tenantBranchList);

    const branchMap = new Map<string, { revenue: number; expenses: number }>();
    for (const b of tenantBranchList) {
      const name = typeof b.name === 'string' ? b.name : 'Unassigned';
      branchMap.set(name, { revenue: 0, expenses: 0 });
    }
    for (const row of branchIncomeRows) {
      const name = resolveBranchName(row.branch);
      const entry = branchMap.get(name) ?? { revenue: 0, expenses: 0 };
      entry.revenue += parseFloat(row.income) || 0;
      branchMap.set(name, entry);
    }
    for (const row of branchExpenseRows) {
      const name = resolveBranchName(row.branch);
      const entry = branchMap.get(name) ?? { revenue: 0, expenses: 0 };
      entry.expenses += parseFloat(row.expenses) || 0;
      branchMap.set(name, entry);
    }
    const revenueByBranch: FinancialBranchBreakdown[] = Array.from(branchMap.entries()).map(
      ([branchName, v]) => ({
        branchName,
        revenue: v.revenue,
        expenses: v.expenses,
        netProfit: v.revenue - v.expenses,
      }),
    );

    // ── Per-course breakdown (cash inflow/outflow per Course) ───────────────
    const teacherSalaryMap = new Map<string, number>();
    for (const t of teacherSalaryRows) {
      teacherSalaryMap.set(t.id, parseFloat(t.salary ?? '0') || 0);
    }
    const courseBreakdown: FinancialCourseBreakdown[] = courseRows.map((r) => {
      const income = parseFloat(r.income) || 0;
      const expenses = r.teacherId ? (teacherSalaryMap.get(r.teacherId) ?? 0) : 0;
      return {
        courseId: r.id,
        courseName: r.title,
        income,
        expenses,
        netProfit: income - expenses,
        currency: r.currency || currency,
      };
    });

    // ── Per-student breakdown (cash inflow/outflow per individual student) ──
    const studentBreakdown: FinancialStudentBreakdown[] = studentRows.map((r) => {
      const inflow = parseFloat(r.inflow) || 0;
      const outflow = parseFloat(r.outflow) || 0;
      return {
        studentId: r.studentId,
        studentName: `${r.firstName} ${r.lastName}`.trim(),
        // BUG #9 FIX: s.branch NULL bo'lsa ham, yagona filial fallback bilan to'ldiriladi
        // (filtr dropdown va branch breakdown bilan mos kelishi uchun)
        branch: resolveBranchName(r.branch),
        inflow,
        outflow,
        netProfit: inflow - outflow,
        currency,
      };
    });

    const topStudents = studentBreakdown.slice(0, 5).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      totalPaid: s.inflow,
      currency: s.currency,
    }));

    // ── Payment method breakdown with percentages ───────────────────────────
    const methodTotal = byMethod.reduce((sum, m) => sum + (parseFloat(m.total ?? '0') || 0), 0);
    const paymentMethodBreakdown = byMethod.map((m) => {
      const amount = parseFloat(m.total ?? '0') || 0;
      return {
        method: m.method,
        amount,
        percent: methodTotal > 0 ? Math.round((amount / methodTotal) * 100) : 0,
      };
    });

    return {
      currency,
      mrr,
      arr: mrr * 12,
      totalIncome,
      totalExpenses,
      netProfit,
      totalPaid: totalIncome,
      totalOutstanding: parseFloat(pending[0]?.total ?? '0') || 0,
      overdueTotal: parseFloat(overdue[0]?.total ?? '0') || 0,
      revenueTimeline,
      revenueByBranch,
      paymentMethodBreakdown,
      topStudents,
      courseBreakdown,
      studentBreakdown,
    };
  }

  async manageBranches(tenantId: string, dto: ManageBranchDto): Promise<{ branches: BranchDto[] }> {
    const tenant = await this.dataSource.query(
      `SELECT branches FROM tenants WHERE id = $1`,
      [tenantId],
    ) as BranchRow[];
    if (!tenant.length) throw new NotFoundException('Tenant not found');

    // FIX: JSONB string sifatida kelishi mumkin → parse qilish
    let branches: BranchDto[] = parseBranchesJson(tenant[0].branches);

    if (dto.id) {
      branches = branches.map((b) => b.id === dto.id ? { ...b, ...dto } : b);
    } else {
      branches.push({ id: uuidv4(), ...dto });
    }
    await this.dataSource.query(
      `UPDATE tenants SET branches = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(branches), tenantId],
    );
    return { branches };
  }

  async getBranches(tenantId: string): Promise<BranchResponseDto[]> {
    const [tenantRows, branchStudentRows, branchTeacherRows, branchCourseRows, branchRevenueRows] =
      await Promise.all([
        this.dataSource.query(
          `SELECT currency, branches FROM tenants WHERE id = $1`,
          [tenantId],
        ) as Promise<TenantCurrencyRow[]>,

        // OBS-08 FIX: students.branch ko'pincha NULL — buildBranchResolver orqali
        // NULL filial isMain:true filialga (yoki birinchi filialga) qo'shiladi.
        this.dataSource.query(
          `SELECT branch, COUNT(*) as count FROM students
           WHERE tenant_id = $1 AND deleted_at IS NULL
           GROUP BY branch`,
          [tenantId],
        ) as Promise<BranchStudentCountRow[]>,

        this.dataSource.query(
          `SELECT branch, COUNT(*) as count FROM teachers
           WHERE tenant_id = $1 AND deleted_at IS NULL
           GROUP BY branch`,
          [tenantId],
        ) as Promise<BranchStudentCountRow[]>,

        // Kurslar branch ustuniga ega emas — o'qituvchisi orqali filialga bog'lanadi
        this.dataSource.query(
          `SELECT t.branch as branch, COUNT(*) as count
           FROM courses c
           LEFT JOIN teachers t ON t.id = c.teacher_id AND t.deleted_at IS NULL
           WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
           GROUP BY t.branch`,
          [tenantId],
        ) as Promise<BranchStudentCountRow[]>,

        // Joriy oy uchun filial bo'yicha daromad (talaba filiali orqali)
        this.dataSource.query(
          `SELECT s.branch as branch, COALESCE(SUM(p.total_amount), 0) as revenue
           FROM payments p
           JOIN students s ON s.id = p.student_id
           WHERE p.tenant_id = $1 AND p.status = 'paid'
             AND p.paid_at >= date_trunc('month', CURRENT_DATE)
           GROUP BY s.branch`,
          [tenantId],
        ) as Promise<BranchRevenueRow[]>,
      ]);

    if (!tenantRows.length) throw new NotFoundException('Tenant not found');

    // FIX: JSONB string sifatida kelishi mumkin → parseBranchesJson ishlatish
    const rawBranches: BranchDto[] = parseBranchesJson(tenantRows[0]?.branches);

    // Agar branch yo'q bo'lsa - bo'sh array qaytariladi (500 emas)
    if (rawBranches.length === 0) {
      return [];
    }

    const currency = tenantRows[0]?.currency || 'UZS';
    const resolveBranchName = buildBranchResolver(rawBranches);

    const studentCounts = new Map<string, number>();
    for (const row of branchStudentRows) {
      const name = resolveBranchName(row.branch);
      studentCounts.set(name, (studentCounts.get(name) ?? 0) + parseInt(row.count, 10));
    }
    const teacherCounts = new Map<string, number>();
    for (const row of branchTeacherRows) {
      const name = resolveBranchName(row.branch);
      teacherCounts.set(name, (teacherCounts.get(name) ?? 0) + parseInt(row.count, 10));
    }
    const courseCounts = new Map<string, number>();
    for (const row of branchCourseRows) {
      const name = resolveBranchName(row.branch);
      courseCounts.set(name, (courseCounts.get(name) ?? 0) + parseInt(row.count, 10));
    }
    const revenueTotals = new Map<string, number>();
    for (const row of branchRevenueRows) {
      const name = resolveBranchName(row.branch);
      revenueTotals.set(name, (revenueTotals.get(name) ?? 0) + parseFloat(row.revenue));
    }

    return rawBranches.map((b) => {
      const branchName = (b['name'] as string | undefined) ?? b.id;

      return {
        id: b.id,
        name: (b['name'] as string) ?? '',
        address: (b['address'] as string) ?? null,
        phone: (b['phone'] as string) ?? null,
        managerId: (b['managerId'] as string) ?? null,
        managerName: (b['managerName'] as string) ?? null,
        studentCount: studentCounts.get(branchName) ?? 0,
        teacherCount: teacherCounts.get(branchName) ?? 0,
        courseCount: courseCounts.get(branchName) ?? 0,
        monthlyRevenue: revenueTotals.get(branchName) ?? 0,
        currency,
        isActive: (b['isActive'] as boolean) ?? true,
        createdAt: (b['createdAt'] as Date) ?? new Date(),
      };
    });
  }

  async getGlobalAnalytics(tenantId: string): Promise<GlobalAnalyticsDto> {
    const [
      studentsRow, teachersRow, coursesRow, activeGroupsRow, tenantRows,
      branchStudentRows, branchRevenueRows, branchAttendanceRows,
    ] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM courses WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,
      this.dataSource.query(`SELECT COUNT(*) FROM groups WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL`, [tenantId]) as Promise<CountRow[]>,

      // BUG #6 FIX: filial bo'yicha taqqoslash uchun tenant.branches kerak
      this.dataSource.query(`SELECT branches FROM tenants WHERE id = $1`, [tenantId]) as Promise<BranchRow[]>,

      // BUG #6 FIX: filial bo'yicha o'quvchilar soni
      this.dataSource.query(
        `SELECT branch as branch, COUNT(*) as count FROM students
         WHERE tenant_id = $1 AND deleted_at IS NULL
         GROUP BY branch`,
        [tenantId],
      ) as Promise<BranchStudentCountRow[]>,

      // BUG #6 FIX: filial bo'yicha daromad (to'langan to'lovlar, talaba filiali bo'yicha)
      this.dataSource.query(
        `SELECT s.branch as branch, COALESCE(SUM(p.total_amount), 0) as revenue
         FROM payments p
         JOIN students s ON s.id = p.student_id
         WHERE p.tenant_id = $1 AND p.status = 'paid'
         GROUP BY s.branch`,
        [tenantId],
      ) as Promise<BranchRevenueRow[]>,

      // BUG #6 FIX: filial bo'yicha davomat foizi
      this.dataSource.query(
        `SELECT s.branch as branch, COUNT(*) as total,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE a.tenant_id = $1
         GROUP BY s.branch`,
        [tenantId],
      ) as Promise<BranchAttendanceRow[]>,
    ]);

    const revenueByMonth: RevenueByMonthDto[] = [];
    const studentGrowth: StudentGrowthDto[] = [];
    const userGrowth: UserGrowthPointDto[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const rev = await this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE tenant_id = $1 AND status = 'paid' AND paid_at BETWEEN $2 AND $3`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyRevenueRow[];
      revenueByMonth.push({ month: monthKey, amount: parseFloat(rev[0]?.total ?? '0') });

      const growth = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3 AND deleted_at IS NULL`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyCountRow[];
      studentGrowth.push({ month: monthKey, count: parseInt(growth[0]?.count ?? '0', 10) });

      // BUG #6 FIX: userGrowth — har oyda qo'shilgan o'quvchi va o'qituvchilar soni
      const teacherGrowth = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM teachers WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3 AND deleted_at IS NULL`,
        [tenantId, monthStart, monthEnd],
      ) as MonthlyCountRow[];
      userGrowth.push({
        month: monthKey,
        students: parseInt(growth[0]?.count ?? '0', 10),
        teachers: parseInt(teacherGrowth[0]?.count ?? '0', 10),
      });
    }

    const totalRevenue = revenueByMonth.reduce((s, m) => s + m.amount, 0);

    // ── BUG #6 FIX: Branch comparison — filiallar bo'yicha o'quvchilar soni,
    // daromad va davomat foizini taqqoslash (avval har doim bo'sh massiv edi,
    // frontend "Branch A/B/C" hardcoded mock bilan to'ldirardi)
    const tenantBranchList = parseBranchesJson(tenantRows[0]?.branches);
    const resolveBranchName = buildBranchResolver(tenantBranchList);

    const branchComparisonMap = new Map<string, { students: number; revenue: number; attTotal: number; attPresent: number }>();
    for (const b of tenantBranchList) {
      const name = typeof b.name === 'string' ? b.name : 'Unassigned';
      branchComparisonMap.set(name, { students: 0, revenue: 0, attTotal: 0, attPresent: 0 });
    }
    for (const row of branchStudentRows) {
      const name = resolveBranchName(row.branch);
      const entry = branchComparisonMap.get(name) ?? { students: 0, revenue: 0, attTotal: 0, attPresent: 0 };
      entry.students += parseInt(row.count, 10) || 0;
      branchComparisonMap.set(name, entry);
    }
    for (const row of branchRevenueRows) {
      const name = resolveBranchName(row.branch);
      const entry = branchComparisonMap.get(name) ?? { students: 0, revenue: 0, attTotal: 0, attPresent: 0 };
      entry.revenue += parseFloat(row.revenue) || 0;
      branchComparisonMap.set(name, entry);
    }
    for (const row of branchAttendanceRows) {
      const name = resolveBranchName(row.branch);
      const entry = branchComparisonMap.get(name) ?? { students: 0, revenue: 0, attTotal: 0, attPresent: 0 };
      entry.attTotal += parseInt(row.total, 10) || 0;
      entry.attPresent += parseInt(row.present ?? '0', 10) || 0;
      branchComparisonMap.set(name, entry);
    }
    const branchComparison: BranchComparisonDto[] = Array.from(branchComparisonMap.entries()).map(
      ([branchName, v]) => ({
        branchName,
        students: v.students,
        revenue: v.revenue,
        attendanceRate: v.attTotal > 0 ? Math.round((v.attPresent / v.attTotal) * 100 * 10) / 10 : 0,
      }),
    );

    const topCourseRaw = await this.dataSource.query(
      `SELECT e.course_id as courseId, c.title as name, COUNT(e.id) as enrollmentCount,
              COALESCE(SUM(c.price), 0) as revenue
       FROM enrollments e
       LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.tenant_id = $1
       GROUP BY e.course_id, c.title
       ORDER BY COUNT(e.id) DESC
       LIMIT 5`,
      [tenantId],
    ) as Array<{ courseid: string; name: string; enrollmentcount: string; revenue: string }>;

    const topCourses: TopCourseDto[] = topCourseRaw.map((r) => ({
      courseId: r.courseid,
      name: r.name ?? 'Unknown',
      enrollmentCount: parseInt(r.enrollmentcount, 10),
      revenue: parseFloat(r.revenue),
    }));

    // FIX: FROM attendance (ko'plik emas) va status = 'present' (enum qiymat)
    const attResult = await this.dataSource.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
       FROM attendance WHERE tenant_id = $1`,
      [tenantId],
    ) as MonthlyAttRow[];
    const t = parseInt(attResult[0]?.total ?? '0', 10);
    const p = parseInt(attResult[0]?.present ?? '0', 10);
    const attendanceRate = t > 0 ? Math.round((p / t) * 100 * 10) / 10 : 0;

    return {
      totalRevenue,
      totalStudents: parseInt(studentsRow[0].count, 10),
      totalTeachers: parseInt(teachersRow[0].count, 10),
      totalCourses: parseInt(coursesRow[0].count, 10),
      activeGroups: parseInt(activeGroupsRow[0].count, 10),
      attendanceRate,
      revenueByMonth,
      studentGrowth,
      topCourses,
      branchComparison,
      userGrowth,
    };
  }

  async getRoles(tenantId: string): Promise<RoleResponseDto[]> {
    const roles = await this.rolesService.findAll(tenantId);
    return Promise.all(
      roles.map(async (r) => {
        const countResult = await this.dataSource.query(
          `SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND custom_role_id = $2 AND deleted_at IS NULL`,
          [tenantId, r.id],
        ) as CountRow[];
        return {
          id: r.id,
          name: r.name,
          description: r.description ?? null,
          permissions: r.permissions ?? [],
          isSystem: r.isSystem ?? false,
          userCount: parseInt(countResult[0]?.count ?? '0', 10),
        };
      }),
    );
  }

  async createRole(tenantId: string, dto: OwnerCreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rolesService.create(
      { name: dto.name, description: dto.description, permissions: dto.permissions as unknown as Permission[] },
      tenantId,
    );
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions ?? [],
      isSystem: role.isSystem ?? false,
      userCount: 0,
    };
  }

  async updateRolePermissions(
    roleId: string,
    tenantId: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    const updated = await this.rolesService.update(roleId, tenantId, { permissions: dto.permissions });
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND custom_role_id = $2 AND deleted_at IS NULL`,
      [tenantId, roleId],
    ) as CountRow[];
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? null,
      permissions: updated.permissions ?? [],
      isSystem: updated.isSystem ?? false,
      userCount: parseInt(countResult[0]?.count ?? '0', 10),
    };
  }

  async assignUserRole(userId: string, tenantId: string, dto: OwnerAssignRoleDto): Promise<{ message: string; userId: string; role: UserRole }> {
    const userRows = await this.dataSource.query(
      `SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [userId, tenantId],
    ) as Array<{ id: string; role: UserRole }>;
    if (!userRows.length) throw new NotFoundException(`User ${userId} not found`);

    // Super Admin is a platform-level role above tenant Owner — an Owner must
    // not be able to demote/modify a Super Admin's account or grant the
    // Super Admin role to anyone (privilege escalation).
    if (userRows[0].role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot change the role of a Super Admin');
    }
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign the Super Admin role');
    }

    await this.dataSource.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [dto.role, userId, tenantId],
    );
    this.eventEmitter.emit('audit.action', { tenantId, action: 'role_change', entityId: userId, newValue: { role: dto.role } });
    return { message: 'User role updated', userId, role: dto.role };
  }

  // Used by Owner > Users > "Invite" dialog (POST /owner/users/invite).
  // Creates a pending user with a random temporary password — no email
  // delivery system exists yet, so the temp password is emitted via
  // 'user.invited' event for downstream notification handlers (if any).
  async inviteUser(tenantId: string, dto: OwnerInviteUserDto): Promise<{ message: string; userId: string; email: string; role: UserRole }> {
    // Owner cannot create platform-level Super Admin accounts.
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot invite a user with the Super Admin role');
    }

    const existing = await this.dataSource.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [dto.email, tenantId],
    ) as Array<{ id: string }>;
    if (existing.length) throw new ConflictException('User with this email already exists in this tenant');

    const userId = uuidv4();
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const firstName = dto.firstName?.trim() || dto.email.split('@')[0] || 'New';
    const lastName = dto.lastName?.trim() || '';

    await this.dataSource.query(
      `INSERT INTO users (id, tenant_id, "firstName", "lastName", email, password, role, status, is_email_verified, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [userId, tenantId, firstName, lastName, dto.email, hashedPassword, dto.role, UserStatus.PENDING, false, JSON.stringify({})],
    );

    this.eventEmitter.emit('user.invited', { tenantId, userId, email: dto.email, role: dto.role, tempPassword });
    this.eventEmitter.emit('audit.action', { tenantId, action: 'user_invited', entityId: userId, newValue: { email: dto.email, role: dto.role } });

    return { message: 'User invited successfully', userId, email: dto.email, role: dto.role };
  }

  async getSystemConfig(tenantId: string): Promise<TenantRow> {
    const tenant = await this.dataSource.query(
      `SELECT name, slug, domain, timezone, default_language, currency, feature_flags, branches, subscription_plan, max_students, max_teachers FROM tenants WHERE id = $1`,
      [tenantId],
    ) as TenantRow[];
    if (!tenant.length) throw new NotFoundException('Tenant not found');
    return tenant[0];
  }

  async updateSystemConfig(tenantId: string, dto: SystemConfigDto): Promise<{ message: string }> {
    const fields: string[] = [];
    const params: (string | number | boolean | Record<string, boolean>)[] = [tenantId];
    if (dto.timezone !== undefined) { fields.push(`timezone = $${params.length + 1}`); params.push(dto.timezone); }
    if (dto.defaultLanguage !== undefined) { fields.push(`default_language = $${params.length + 1}`); params.push(dto.defaultLanguage); }
    if (dto.currency !== undefined) { fields.push(`currency = $${params.length + 1}`); params.push(dto.currency); }
    if (dto.featureFlags !== undefined) { fields.push(`feature_flags = $${params.length + 1}`); params.push(JSON.stringify(dto.featureFlags) as unknown as Record<string, boolean>); }
    if (!fields.length) return { message: 'Nothing to update' };
    fields.push(`updated_at = NOW()`);
    await this.dataSource.query(`UPDATE tenants SET ${fields.join(', ')} WHERE id = $1`, params);
    return { message: 'System config updated' };
  }

  async getAuditLogs(tenantId: string, filters: { page?: string; limit?: string; userId?: string; action?: string }): Promise<PaginatedResult<AuditLogRow>> {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '50', 10);
    const { userId, action } = filters;

    let query = `SELECT * FROM audit_logs WHERE tenant_id = $1`;
    const params: (string | number)[] = [tenantId];
    if (userId) { query += ` AND user_id = $${params.length + 1}`; params.push(userId); }
    if (action) { query += ` AND action = $${params.length + 1}`; params.push(action); }

    const countRes = await this.dataSource.query(
      `SELECT COUNT(*) FROM audit_logs WHERE tenant_id = $1`,
      [tenantId],
    ) as CountRow[];

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);
    const logs = await this.dataSource.query(query, params) as AuditLogRow[];

    return { data: logs, meta: { total: parseInt(countRes[0]?.count || '0', 10), page, limit } };
  }

  async exportData(tenantId: string, type: string): Promise<Buffer> {
    let rows: ExportStudentRow[] = [];
    if (type === 'students') {
      rows = await this.dataSource.query(
        `SELECT s.student_code, u."firstName", u."lastName", u.email, u.phone, s.enrollment_date, s.debt_amount, s.branch
         FROM students s JOIN users u ON u.id = s.user_id WHERE s.tenant_id = $1 AND s.deleted_at IS NULL ORDER BY s.created_at`,
        [tenantId],
      ) as ExportStudentRow[];
    } else if (type === 'payments') {
      rows = await this.dataSource.query(
        `SELECT p.invoice_number, u."firstName", u."lastName", p.amount, p.total_amount, p.currency, p.status, p.payment_method, p.paid_at, p.due_date
         FROM payments p JOIN students s ON s.id = p.student_id JOIN users u ON u.id = s.user_id WHERE p.tenant_id = $1 ORDER BY p.created_at`,
        [tenantId],
      ) as ExportStudentRow[];
    } else if (type === 'attendance') {
      // FIX: FROM attendance (ko'plik emas)
      rows = await this.dataSource.query(
        `SELECT u."firstName", u."lastName", a.status, a.late_minutes, a.date
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN users u ON u.id = s.user_id
         WHERE a.tenant_id = $1
         ORDER BY a.date DESC
         LIMIT 1000`,
        [tenantId],
      ) as ExportStudentRow[];
    } else if (type === 'users') {
      // Owner > Users > Export button (GET /owner/export/users)
      rows = await this.dataSource.query(
        `SELECT u."firstName", u."lastName", u.email, u.phone, u.role, u.status, u.branch, u.last_login_at, u.created_at
         FROM users u
         WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
         ORDER BY u.created_at DESC`,
        [tenantId],
      ) as ExportStudentRow[];
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type);
    if (rows.length > 0) {
      sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 20 }));
      rows.forEach((r) => sheet.addRow(r));
    }
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}