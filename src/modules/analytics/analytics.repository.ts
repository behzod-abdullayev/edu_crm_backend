import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AnalyticsSnapshot } from './entities/analytics-snapshot.entity';

@Injectable()
export class AnalyticsRepository extends Repository<AnalyticsSnapshot> {
  constructor(private dataSource: DataSource) {
    super(AnalyticsSnapshot, dataSource.createEntityManager());
  }

  async getOverview(tenantId: string): Promise<any> {
    const [students, teachers, revenue, attendance] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
      this.dataSource.query(`SELECT COUNT(*) FROM teachers WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
      this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount),0) as mrr FROM payments
         WHERE tenant_id = $1 AND status='paid' AND paid_at >= DATE_TRUNC('month', NOW())`, [tenantId],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
         FROM attendances WHERE tenant_id = $1 AND marked_at >= NOW() - INTERVAL '30 days'`, [tenantId],
      ),
    ]);
    const att = attendance[0];
    return {
      totalStudents: parseInt(students[0].count, 10),
      totalTeachers: parseInt(teachers[0].count, 10),
      monthlyRevenue: parseFloat(revenue[0].mrr),
      attendanceRate: att.total > 0 ? Math.round((parseInt(att.present, 10) / parseInt(att.total, 10)) * 100) : 0,
    };
  }

  async upsertSnapshot(tenantId: string, date: Date, type: string, data: any): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO analytics_snapshots (tenant_id, date, type, data, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, date, type) DO UPDATE SET data = $4`,
      [tenantId, date, type, JSON.stringify(data)],
    );
  }

  async getFinancialAnalytics(tenantId: string, from: Date, to: Date): Promise<any[]> {
    return this.dataSource.query(
      `SELECT DATE_TRUNC('day', paid_at) as date, SUM(total_amount) as revenue, COUNT(*) as count
       FROM payments WHERE tenant_id = $1 AND status='paid' AND paid_at BETWEEN $2 AND $3
       GROUP BY DATE_TRUNC('day', paid_at) ORDER BY date`, [tenantId, from, to],
    );
  }
}
