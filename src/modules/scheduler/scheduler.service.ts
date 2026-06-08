import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment } from '../payments/entities/payment.entity';
import { Student } from '../students/entities/student.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { PaymentStatus, UserRole, NotificationChannel } from '../../shared/enums';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Tenant) private tenantsRepo: Repository<Tenant>,
    @InjectRepository(Schedule) private schedulesRepo: Repository<Schedule>,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 0 * * *')
  async processOverduePayments(): Promise<void> {
    this.logger.log('Processing overdue payments...');
    const overduePayments = await this.paymentsRepo.find({
      where: { status: PaymentStatus.PENDING, dueDate: LessThan(new Date()) },
    });

    for (const payment of overduePayments) {
      await this.paymentsRepo.update(payment.id, { status: PaymentStatus.OVERDUE });
      const debtResult = await this.paymentsRepo
        .createQueryBuilder('p')
        .select('SUM(p.totalAmount)', 'debt')
        .where('p.studentId = :sid AND p.tenantId = :tid AND p.status IN (:...statuses)', {
          sid: payment.studentId,
          tid: payment.tenantId,
          statuses: [PaymentStatus.PENDING, PaymentStatus.OVERDUE],
        })
        .getRawOne<{ debt: string }>();
      await this.studentsRepo.update(payment.studentId, {
        debtAmount: parseFloat(debtResult?.debt || '0'),
      });
      this.eventEmitter.emit('payment.overdue', { payment });
    }
    this.logger.log(`Processed ${overduePayments.length} overdue payments`);
  }

  @Cron('0 2 * * *')
  async computeAnalyticsSnapshot(): Promise<void> {
    this.logger.log('Computing analytics snapshots...');
    const tenants = await this.tenantsRepo.find({ where: { isActive: true } });
    for (const tenant of tenants) {
      this.eventEmitter.emit('analytics.compute_snapshot', { tenantId: tenant.id });
    }
    this.logger.log(`Queued snapshots for ${tenants.length} tenants`);
  }

  @Cron('0 9 * * 1')
  async sendWeeklyReports(): Promise<void> {
    this.logger.log('Sending weekly reports to all tenant admins');
    const tenants = await this.tenantsRepo.find({ where: { isActive: true } });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    for (const tenant of tenants) {
      const newStudents = await this.studentsRepo
        .createQueryBuilder('s')
        .where('s.tenantId = :tid AND s.createdAt BETWEEN :from AND :to', {
          tid: tenant.id, from: oneWeekAgo, to: now,
        })
        .getCount();

      const weeklyRevenueRaw = await this.paymentsRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.totalAmount), 0)', 'total')
        .where('p.tenantId = :tid AND p.status = :status AND p.paidAt BETWEEN :from AND :to', {
          tid: tenant.id, status: PaymentStatus.PAID, from: oneWeekAgo, to: now,
        })
        .getRawOne<{ total: string }>();

      const attendanceRaw = await this.schedulesRepo.manager.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
         FROM attendances WHERE tenant_id=$1 AND marked_at BETWEEN $2 AND $3`,
        [tenant.id, oneWeekAgo, now],
      ) as Array<{ total: string; present: string }>;

      const homeworkRaw = await this.schedulesRepo.manager.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN hs.status='submitted' THEN 1 ELSE 0 END) as submitted
         FROM homework_submissions hs
         JOIN homeworks h ON h.id = hs.homework_id
         WHERE h.tenant_id=$1 AND hs.submitted_at BETWEEN $2 AND $3`,
        [tenant.id, oneWeekAgo, now],
      ) as Array<{ total: string; submitted: string }>;

      const attData = attendanceRaw[0];
      const hwData = homeworkRaw[0];
      const attendanceRate =
        parseInt(attData.total, 10) > 0
          ? Math.round((parseInt(attData.present, 10) / parseInt(attData.total, 10)) * 100)
          : 0;
      const homeworkRate =
        parseInt(hwData.total, 10) > 0
          ? Math.round((parseInt(hwData.submitted, 10) / parseInt(hwData.total, 10)) * 100)
          : 0;

      const admins = await this.schedulesRepo.manager.query(
        `SELECT u.id, u.email, u.first_name FROM users u
         WHERE u.tenant_id = $1 AND u.role = $2 AND u.status = 'active' AND u.deleted_at IS NULL`,
        [tenant.id, UserRole.ADMIN],
      ) as Array<{ id: string; email: string; first_name: string }>;

      for (const admin of admins) {
        this.eventEmitter.emit('notification.send', {
          userId: admin.id,
          tenantId: tenant.id,
          channel: NotificationChannel.EMAIL,
          event: 'report.weekly',
          email: admin.email,
          title: `Weekly Report — ${tenant.name}`,
          body: [
            `Weekly Summary for ${tenant.name}:`,
            `- New Students This Week: ${newStudents}`,
            `- Revenue This Week: ${parseFloat(weeklyRevenueRaw?.total || '0').toFixed(2)}`,
            `- Attendance Rate: ${attendanceRate}%`,
            `- Homework Submission Rate: ${homeworkRate}%`,
          ].join('\n'),
          data: {
            newStudents,
            weeklyRevenue: weeklyRevenueRaw?.total,
            attendanceRate,
            homeworkRate,
          },
        });
      }
    }
    this.logger.log(`Sent weekly reports for ${tenants.length} tenants`);
  }

  @Cron('0 8 * * *')
  async sendDailyReminders(): Promise<void> {
    this.logger.log('Sending daily schedule reminders');
    const todayStr = new Date().toISOString().split('T')[0];

    // Query schedules that have specificDate = today and are not cancelled
    const schedules = await this.schedulesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.group', 'g')
      .leftJoinAndSelect('s.course', 'c')
      .where('CAST(s.specificDate AS text) = :date AND s.isCancelled = false', {
        date: todayStr,
      })
      .getMany();

    const notifications: Array<{
      userId: string;
      tenantId: string;
      channel: NotificationChannel;
      event: string;
      title: string;
      body: string;
    }> = [];

    for (const schedule of schedules) {
      if (!schedule.groupId) continue;

      const enrollments = await this.schedulesRepo.manager.query(
        `SELECT e.student_id, s.user_id FROM enrollments e
         JOIN students s ON s.id = e.student_id
         WHERE e.group_id = $1 AND e.status = 'active'`,
        [schedule.groupId],
      ) as Array<{ student_id: string; user_id: string }>;

      const courseName = schedule.course?.title || 'Class';
      const startTime = schedule.startTime || '';

      for (const enrollment of enrollments) {
        notifications.push({
          userId: enrollment.user_id,
          tenantId: schedule.tenantId,
          channel: NotificationChannel.IN_APP,
          event: 'schedule.reminder',
          title: "Today's schedule",
          body: `You have ${courseName} at ${startTime}`,
        });
      }
    }

    if (notifications.length > 0) {
      this.eventEmitter.emit('notification.bulk', notifications);
    }

    this.logger.log(
      `Sent ${notifications.length} daily reminders for ${schedules.length} schedules`,
    );
  }
}
