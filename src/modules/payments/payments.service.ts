import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import PDFDocument from 'pdfkit';
import { PaymentsRepository } from './payments.repository';
import { PaymentStatus } from '../../shared/enums';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import { Payment } from './entities/payment.entity';
import { Discount, DiscountType } from './entities/discount.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { DebtSummaryResponseDto } from './dto/debt-summary-response.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { RefundDto } from './dto/refund.dto';
import { InjectRepository } from '@nestjs/typeorm';

interface StudentNameRow { name: string; }
interface TenantNameRow { name: string; }
interface CourseTitleRow { title: string; }

@Injectable()
export class PaymentsService {
  constructor(
    private paymentsRepository: PaymentsRepository,
    @InjectRepository(Discount) private discountRepo: Repository<Discount>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(tenantId: string, query: QueryPaymentsDto): Promise<PaginatedResult<Payment>> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [data, total] = await this.paymentsRepository.findPaginated(
      tenantId, page, limit, query.studentId, query.status,
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, tenantId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(dto: CreatePaymentDto, tenantId: string, createdBy: string): Promise<Payment> {
    const invoiceNumber = await this.paymentsRepository.getNextInvoiceNumber(tenantId);
    const amount = Number(dto.amount ?? 0);
    const taxPercent = Number(dto.taxPercent ?? 0);
    const discountPercent = Number(dto.discountPercent ?? 0);
    const discountAmount = discountPercent ? (amount * discountPercent) / 100 : 0;
    const taxAmount = taxPercent ? (amount * taxPercent) / 100 : 0;
    const totalAmount = amount - discountAmount + taxAmount;

    const payment = this.paymentsRepository.create({
      tenantId,
      studentId: dto.studentId,
      courseId: dto.courseId,
      invoiceNumber,
      amount,
      currency: dto.currency || 'UZS',
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      totalAmount,
      status: PaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      notes: dto.notes,
      receivedBy: createdBy,
    } as any);

    const saved = await this.paymentsRepository.save(payment) as unknown as Payment;

    await this.createInvoice(saved);

    this.eventEmitter.emit('payment.created', { payment: saved, tenantId });
    return saved;
  }

  async createInvoice(payment: Payment): Promise<Invoice> {
    const invoiceNumber = `INV-${payment.invoiceNumber}`;
    const invoice = this.invoiceRepo.create({
      tenantId: payment.tenantId,
      paymentId: payment.id,
      studentId: payment.studentId,
      invoiceNumber,
      issuedAt: new Date(),
      dueDate: payment.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: payment.amount,
      discountAmount: payment.discountAmount || 0,
      taxAmount: payment.taxAmount || 0,
      totalAmount: payment.totalAmount,
      currency: payment.currency || 'USD',
      status: InvoiceStatus.SENT,
    });
    return this.invoiceRepo.save(invoice) as unknown as Promise<Invoice>;
  }

  async getInvoice(paymentId: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { paymentId, tenantId },
      relations: ['payment'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found for this payment');
    return invoice;
  }

  async pay(id: string, tenantId: string): Promise<{ message: string; invoiceNumber: string }> {
    const payment = await this.findOne(id, tenantId);
    if (payment.status === PaymentStatus.PAID) throw new BadRequestException('Payment already paid');
    await this.paymentsRepository.update(id, {
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    } as any);
    await this.dataSource.query(
      `UPDATE students SET total_paid = total_paid + $1, debt_amount = GREATEST(0, debt_amount - $1) WHERE id = $2`,
      [payment.totalAmount, payment.studentId],
    );
    await this.invoiceRepo.update({ paymentId: id }, { status: InvoiceStatus.PAID });
    // Emit payment.received so NotificationsGateway can push to the student
    this.eventEmitter.emit('payment.received', { studentId: payment.studentId, payment });
    return { message: 'Payment confirmed', invoiceNumber: payment.invoiceNumber };
  }

  async refund(id: string, dto: RefundDto, tenantId: string): Promise<{ message: string; refundedAmount: number }> {
    const payment = await this.findOne(id, tenantId);
    if (payment.status !== PaymentStatus.PAID) throw new BadRequestException('Can only refund paid payments');
    const refundAmount = Number(dto.amount ?? payment.totalAmount);
    await this.paymentsRepository.update(id, {
      status: PaymentStatus.REFUNDED,
      refundedAmount: refundAmount,
      refundReason: dto.reason,
      refundedAt: new Date(),
    } as any);
    this.eventEmitter.emit('payment.refunded', { payment, refundAmount, tenantId });
    return { message: 'Refund processed', refundedAmount: refundAmount };
  }

  async applyDiscount(
    dto: ApplyDiscountDto,
    tenantId: string,
  ): Promise<{ discountId: string; discountAmount: number; newTotal: number; code: string }> {
    const discount = await this.discountRepo.findOne({
      where: { code: dto.code, tenantId, isActive: true },
    });

    if (!discount) throw new BadRequestException('Invalid or expired discount code');

    if (discount.validUntil && discount.validUntil < new Date()) {
      throw new BadRequestException('Discount code has expired');
    }

    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      throw new BadRequestException('Discount code usage limit reached');
    }

    if (discount.applicableCourseIds !== null && dto.courseId) {
      if (!discount.applicableCourseIds.includes(dto.courseId)) {
        throw new BadRequestException('Discount code is not applicable to this course');
      }
    }

    const payment = await this.findOne(dto.paymentId, tenantId);

    const discountAmount =
      discount.type === DiscountType.PERCENTAGE
        ? (payment.amount * Number(discount.value)) / 100
        : Number(discount.value);

    const newTotal = Math.max(0, payment.totalAmount - discountAmount);

    await this.paymentsRepository.update(dto.paymentId, {
      discountAmount,
      totalAmount: newTotal,
    } as any);

    await this.discountRepo.increment({ id: discount.id }, 'usedCount', 1);

    return { discountId: discount.id, discountAmount, newTotal, code: discount.code };
  }

  async createDiscount(dto: Partial<Discount>, tenantId: string, createdBy: string): Promise<Discount> {
    const discount = this.discountRepo.create({
      ...dto,
      tenantId,
      createdBy,
      usedCount: 0,
      isActive: true,
    });
    return this.discountRepo.save(discount) as unknown as Promise<Discount>;
  }

  async getRevenueReport(tenantId: string, from: Date, to: Date): Promise<unknown> {
    return this.paymentsRepository.getRevenueReport(tenantId, from, to);
  }

  async getDebtors(tenantId: string): Promise<unknown[]> {
    return this.paymentsRepository.getDebtors(tenantId);
  }

  async update(id: string, dto: UpdatePaymentDto, tenantId: string): Promise<Payment> {
    await this.findOne(id, tenantId);
    await this.paymentsRepository.update(id, dto as any);
    return this.findOne(id, tenantId);
  }

  private async buildPdfBuffer(
    payment: Payment,
    extra: { studentName: string; courseName: string; tenantName: string },
    docType: 'RECEIPT' | 'INVOICE',
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text(extra.tenantName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text(docType, { align: 'center' });
      doc.moveDown();

      const labelX = 50;
      const valueX = 250;
      const lineHeight = 22;
      let y = doc.y;

      const rows: Array<[string, string]> = [
        [docType === 'RECEIPT' ? 'Receipt #' : 'Invoice #', payment.invoiceNumber],
        ['Student', extra.studentName],
        ['Course', extra.courseName || 'N/A'],
        ['Date', new Date(payment.paidAt || payment.createdAt).toLocaleDateString()],
        ['Amount', `${Number(payment.amount).toFixed(2)} ${payment.currency}`],
        ['Discount', `${Number(payment.discountAmount).toFixed(2)} ${payment.currency}`],
        ['Tax', `${Number(payment.taxAmount).toFixed(2)} ${payment.currency}`],
        ['Total', `${Number(payment.totalAmount).toFixed(2)} ${payment.currency}`],
        ['Status', payment.status.toUpperCase()],
        ['Payment Method', (payment.paymentMethod || 'N/A').toUpperCase()],
      ];

      doc.font('Helvetica').fontSize(11);
      for (const [label, value] of rows) {
        doc.text(label, labelX, y).text(value, valueX, y);
        y += lineHeight;
      }

      doc.moveDown(2);
      doc.fontSize(10).fillColor('grey').text('Thank you for your payment.', { align: 'center' });
      doc.end();
    });
  }

  async generateReceipt(id: string, tenantId: string): Promise<Buffer> {
    const payment = await this.findOne(id, tenantId);

    const [studentRows, tenantRows] = await Promise.all([
      this.dataSource.query(
        `SELECT CONCAT(u.first_name, ' ', u.last_name) as name
         FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
        [payment.studentId],
      ) as Promise<StudentNameRow[]>,
      this.dataSource.query(
        `SELECT name FROM tenants WHERE id = $1`,
        [tenantId],
      ) as Promise<TenantNameRow[]>,
    ]);

    const courseRows: CourseTitleRow[] = payment.courseId
      ? await this.dataSource.query(
          `SELECT title FROM courses WHERE id = $1`,
          [payment.courseId],
        ) as CourseTitleRow[]
      : [];

    const buffer = await this.buildPdfBuffer(
      payment,
      {
        studentName: studentRows[0]?.name || 'Unknown',
        courseName: courseRows[0]?.title || '',
        tenantName: tenantRows[0]?.name || 'EduCRM',
      },
      'RECEIPT',
    );

    const receiptUrl = `/receipts/${payment.invoiceNumber}.pdf`;
    await this.paymentsRepository.update(id, { receiptUrl } as any);
    return buffer;
  }

  async generateInvoicePdf(id: string, tenantId: string): Promise<Buffer> {
    const payment = await this.findOne(id, tenantId);

    const [studentRows, tenantRows] = await Promise.all([
      this.dataSource.query(
        `SELECT CONCAT(u.first_name, ' ', u.last_name) as name
         FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
        [payment.studentId],
      ) as Promise<StudentNameRow[]>,
      this.dataSource.query(
        `SELECT name FROM tenants WHERE id = $1`,
        [tenantId],
      ) as Promise<TenantNameRow[]>,
    ]);

    const courseRows: CourseTitleRow[] = payment.courseId
      ? await this.dataSource.query(
          `SELECT title FROM courses WHERE id = $1`,
          [payment.courseId],
        ) as CourseTitleRow[]
      : [];

    const buffer = await this.buildPdfBuffer(
      payment,
      {
        studentName: studentRows[0]?.name || 'Unknown',
        courseName: courseRows[0]?.title || '',
        tenantName: tenantRows[0]?.name || 'EduCRM',
      },
      'INVOICE',
    );

    const invoiceUrl = `/invoices/${payment.invoiceNumber}.pdf`;
    await this.paymentsRepository.update(id, { invoiceUrl } as any);
    return buffer;
  }

  // ─── NEW METHODS ──────────────────────────────────────────────────────────

  async findAllInvoices(
    tenantId: string,
    query: QueryInvoicesDto,
  ): Promise<{
    data: Invoice[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .orderBy('invoice.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.studentId) {
      qb.andWhere('invoice.studentId = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('invoice.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('invoice.createdAt <= :to', { to: new Date(query.to) });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOneInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.payment', 'payment')
      .where('invoice.id = :id', { id })
      .andWhere('invoice.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    return invoice;
  }

  async getDebtSummary(
    studentId: string,
    tenantId: string,
  ): Promise<DebtSummaryResponseDto> {
    const payments = await this.paymentsRepository.find({
      where: [
        { studentId, tenantId, status: PaymentStatus.OVERDUE },
        { studentId, tenantId, status: PaymentStatus.PENDING },
      ],
      relations: ['course'],
    });

    const totalDebt = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const overduePayments = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : null,
      courseTitle: p.course?.title ?? null,
    }));

    return {
      studentId,
      totalDebt,
      overdueCount: payments.length,
      overduePayments,
    };
  }

  async getSubscriptions(tenantId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: {
        tenantId,
        recurringInterval: Not(IsNull()),
      },
      order: { createdAt: 'DESC' },
      relations: ['student'],
    });
  }
}
