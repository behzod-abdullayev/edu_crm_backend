import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from '../../shared/enums';

@Injectable()
export class PaymentsRepository extends Repository<Payment> {
  constructor(private dataSource: DataSource) {
    super(Payment, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, studentId?: string, status?: PaymentStatus): Promise<[Payment[], number]> {
    const qb = this.createQueryBuilder('payment').where('payment.tenantId = :tenantId', { tenantId });
    if (studentId) qb.andWhere('payment.studentId = :studentId', { studentId });
    if (status) qb.andWhere('payment.status = :status', { status });
    return qb.orderBy('payment.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }

  async findOverduePayments(): Promise<Payment[]> {
    return this.createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.dueDate < NOW()')
      .getMany();
  }

  async getRevenueReport(tenantId: string, from: Date, to: Date): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT
        DATE_TRUNC('month', paid_at) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as count
       FROM payments
       WHERE tenant_id = $1 AND status = 'paid'
         AND paid_at BETWEEN $2 AND $3
       GROUP BY DATE_TRUNC('month', paid_at)
       ORDER BY month`, [tenantId, from, to],
    );
    return result;
  }

  async getNextInvoiceNumber(tenantId: string): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM payments WHERE tenant_id = $1`, [tenantId],
    );
    const count = parseInt(result[0].count, 10) + 1;
    return `INV-${new Date().getFullYear()}-${String(count).padStart(6, '0')}`;
  }

  async getDebtors(tenantId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT s.id, u."firstName" as first_name, u."lastName" as last_name, u.email, u.phone,
              s.debt_amount, COUNT(p.id) as overdue_count
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN payments p ON p.student_id = s.id AND p.status = 'overdue'
       WHERE s.tenant_id = $1 AND s.debt_amount > 0
       GROUP BY s.id, u."firstName", u."lastName", u.email, u.phone, s.debt_amount
       ORDER BY s.debt_amount DESC`, [tenantId],
    );
  }
}
