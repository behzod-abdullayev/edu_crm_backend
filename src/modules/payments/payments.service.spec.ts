import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Discount, DiscountType } from './entities/discount.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../../shared/enums';

const mockPayment = {
  id: 'payment-uuid',
  tenantId: 'tenant-uuid',
  studentId: 'student-uuid',
  courseId: 'course-uuid',
  invoiceNumber: 'INV-2024-000001',
  amount: 500000,
  totalAmount: 500000,
  discountAmount: 0,
  taxAmount: 0,
  currency: 'UZS',
  status: PaymentStatus.PENDING,
  dueDate: new Date('2024-12-31'),
  paidAt: null,
  paymentMethod: 'cash',
};

const mockDiscount = {
  id: 'disc-uuid',
  tenantId: 'tenant-uuid',
  code: 'SAVE10',
  type: DiscountType.PERCENTAGE,
  value: 10,
  isActive: true,
  validFrom: new Date('2024-01-01'),
  validUntil: null,
  maxUses: null,
  usedCount: 0,
  applicableCourseIds: null,
};

const mockDiscountRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn().mockResolvedValue({}),
};

const mockInvoiceRepo = {
  findOne: jest.fn(),
  create: jest.fn().mockReturnValue({ id: 'inv-uuid' }),
  save: jest.fn().mockResolvedValue({ id: 'inv-uuid', status: InvoiceStatus.SENT }),
  update: jest.fn().mockResolvedValue({}),
};

const mockPaymentsRepo = {
  findPaginated: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  getNextInvoiceNumber: jest.fn().mockResolvedValue('INV-2024-000001'),
  getRevenueReport: jest.fn(),
  getDebtors: jest.fn(),
};

const mockDataSource = { query: jest.fn().mockResolvedValue([]) };
const mockEventEmitter = { emit: jest.fn() };

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: mockPaymentsRepo },
        { provide: getRepositoryToken(Discount), useValue: mockDiscountRepo },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated payments', async () => {
      mockPaymentsRepo.findPaginated.mockResolvedValue([[mockPayment], 1]);
      const result = await service.findAll('tenant-uuid', {} as never);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns payment when found', async () => {
      mockPaymentsRepo.findOne.mockResolvedValue(mockPayment);
      const result = await service.findOne('payment-uuid', 'tenant-uuid');
      expect(result.invoiceNumber).toBe('INV-2024-000001');
    });

    it('throws NotFoundException when not found', async () => {
      mockPaymentsRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates payment with correct invoice number and emits event', async () => {
      const savedPayment = { ...mockPayment, id: 'new-pay-id' };
      mockPaymentsRepo.create.mockReturnValue(savedPayment);
      mockPaymentsRepo.save.mockResolvedValue(savedPayment);

      const result = await service.create(
        { studentId: 'student-uuid', amount: 500000, paymentMethod: 'cash' } as never,
        'tenant-uuid',
        'admin-uuid',
      );
      expect(mockPaymentsRepo.getNextInvoiceNumber).toHaveBeenCalledWith('tenant-uuid');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('payment.created', expect.any(Object));
      expect(result).toBeDefined();
    });
  });

  // ─── applyDiscount ────────────────────────────────────────────────────────────

  describe('applyDiscount', () => {
    it('applies percentage discount correctly', async () => {
      mockDiscountRepo.findOne.mockResolvedValue(mockDiscount);
      mockPaymentsRepo.findOne.mockResolvedValue(mockPayment);

      const result = await service.applyDiscount(
        { code: 'SAVE10', paymentId: 'payment-uuid' },
        'tenant-uuid',
      );
      expect(result.discountAmount).toBe(50000); // 10% of 500000
      expect(result.newTotal).toBe(450000);
      expect(mockDiscountRepo.increment).toHaveBeenCalledWith({ id: 'disc-uuid' }, 'usedCount', 1);
    });

    it('throws BadRequestException for invalid code', async () => {
      mockDiscountRepo.findOne.mockResolvedValue(null);
      await expect(service.applyDiscount({ code: 'BAD', paymentId: 'pay-uuid' }, 'tenant-uuid'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired discount', async () => {
      const expiredDiscount = { ...mockDiscount, validUntil: new Date('2020-01-01') };
      mockDiscountRepo.findOne.mockResolvedValue(expiredDiscount);
      await expect(service.applyDiscount({ code: 'SAVE10', paymentId: 'pay-uuid' }, 'tenant-uuid'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when usage limit reached', async () => {
      const maxedDiscount = { ...mockDiscount, maxUses: 10, usedCount: 10 };
      mockDiscountRepo.findOne.mockResolvedValue(maxedDiscount);
      await expect(service.applyDiscount({ code: 'SAVE10', paymentId: 'pay-uuid' }, 'tenant-uuid'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code not applicable to course', async () => {
      const restrictedDiscount = { ...mockDiscount, applicableCourseIds: ['other-course-id'] };
      mockDiscountRepo.findOne.mockResolvedValue(restrictedDiscount);
      mockPaymentsRepo.findOne.mockResolvedValue(mockPayment);
      await expect(service.applyDiscount(
        { code: 'SAVE10', paymentId: 'payment-uuid', courseId: 'course-uuid' },
        'tenant-uuid',
      )).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDebtors ───────────────────────────────────────────────────────────────

  describe('getDebtors', () => {
    it('returns debtor list', async () => {
      mockPaymentsRepo.getDebtors.mockResolvedValue([{ studentId: 's1', debtAmount: 100000 }]);
      const result = await service.getDebtors('tenant-uuid');
      expect(result).toHaveLength(1);
    });
  });

  // ─── generateReceipt ──────────────────────────────────────────────────────────

  describe('generateReceipt', () => {
    it('returns a Buffer', async () => {
      mockPaymentsRepo.findOne.mockResolvedValue(mockPayment);
      mockDataSource.query
        .mockResolvedValueOnce([{ name: 'Alice Smith' }])
        .mockResolvedValueOnce([{ name: 'Test Center' }])
        .mockResolvedValueOnce([{ title: 'Math 101' }]);
      const buffer = await service.generateReceipt('payment-uuid', 'tenant-uuid');
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });
});
