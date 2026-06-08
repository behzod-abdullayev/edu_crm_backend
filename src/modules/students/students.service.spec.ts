import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { UsersRepository } from '../users/users.repository';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockStudent = {
  id: 'student-uuid',
  tenantId: 'tenant-uuid',
  studentCode: 'STU-00001',
  user: { id: 'user-uuid', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
  debtAmount: 0,
};

const mockStudentsRepo = {
  findWithUser: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  getNextStudentCode: jest.fn().mockResolvedValue('STU-00001'),
  getPerformanceSummary: jest.fn(),
  updateDebtAmount: jest.fn(),
};

const mockUsersRepo = {
  findByEmail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockManager = {
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockImplementation((entity: string, data: unknown) => Promise.resolve({ ...data as object, id: 'new-id' })),
};

const mockDataSource = {
  query: jest.fn(),
  transaction: jest.fn().mockImplementation((cb: (m: typeof mockManager) => unknown) => cb(mockManager)),
};

const mockEventEmitter = { emit: jest.fn() };

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: StudentsRepository, useValue: mockStudentsRepo },
        { provide: UsersRepository, useValue: mockUsersRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated students with correct meta', async () => {
      mockStudentsRepo.findWithUser.mockResolvedValue([[mockStudent], 5]);
      const result = await service.findAll('tenant-uuid', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(5);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('applies search filter', async () => {
      mockStudentsRepo.findWithUser.mockResolvedValue([[], 0]);
      await service.findAll('tenant-uuid', { search: 'Alice', page: 1, limit: 10 });
      expect(mockStudentsRepo.findWithUser).toHaveBeenCalledWith('tenant-uuid', 1, 10, 'Alice', undefined, undefined);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns student by id', async () => {
      mockStudentsRepo.findOne.mockResolvedValue(mockStudent);
      const result = await service.findOne('student-uuid', 'tenant-uuid');
      expect(result.id).toBe('student-uuid');
    });

    it('throws NotFoundException for non-existent student', async () => {
      mockStudentsRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates user and student records in a transaction', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockStudentsRepo.getNextStudentCode.mockResolvedValue('STU-00001');
      mockManager.save
        .mockResolvedValueOnce({ id: 'user-new-id', email: 'new@test.com' })
        .mockResolvedValueOnce({ id: 'student-new-id' });

      const result = await service.create(
        { email: 'new@test.com', firstName: 'New', lastName: 'User', password: 'Pass1!' },
        'tenant-uuid',
        'admin-uuid',
      );
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws BadRequestException when email already exists', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.create(
        { email: 'exist@test.com', firstName: 'A', lastName: 'B', password: 'Test1234!' },
        'tenant-uuid',
        'admin-uuid',
      )).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getPerformance ───────────────────────────────────────────────────────────

  describe('getPerformance', () => {
    it('returns performance summary for existing student', async () => {
      mockStudentsRepo.findOne.mockResolvedValue(mockStudent);
      mockStudentsRepo.getPerformanceSummary.mockResolvedValue({
        attendanceRate: 90,
        avgExamScore: 75,
        homeworkCompletionRate: 80,
        avgHomeworkScore: 70,
        totalExams: 3,
      });
      const result = await service.getPerformance('student-uuid', 'tenant-uuid');
      expect(result).toHaveProperty('attendanceRate', 90);
      expect(result).toHaveProperty('avgExamScore', 75);
    });

    it('throws NotFoundException for unknown student', async () => {
      mockStudentsRepo.findOne.mockResolvedValue(null);
      await expect(service.getPerformance('bad-id', 'tenant-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
