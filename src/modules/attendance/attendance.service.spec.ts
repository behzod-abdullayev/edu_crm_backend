import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { DataSource } from 'typeorm';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repo: jest.Mocked<AttendanceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: AttendanceRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
            getStudentSummary: jest.fn(),
            getReport: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: { query: jest.fn().mockResolvedValue([{ group_id: null, teacher_id: null }]) },
        },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
    repo = module.get(AttendanceRepository);
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  it('should return student summary', async () => {
    (repo.getStudentSummary as jest.Mock).mockResolvedValue({ total: 10, present: 8, attendanceRate: 80 });
    const result = await service.getStudentSummary('student-id', 'tenant-id');
    expect(result).toHaveProperty('attendanceRate');
    expect(result.attendanceRate).toBe(80);
  });
});
