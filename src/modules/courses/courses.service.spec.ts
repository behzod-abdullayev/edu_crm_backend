import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesRepository } from './courses.repository';
import { Lesson } from './entities/lesson.entity';
import { Enrollment } from './entities/enrollment.entity';
import { CourseModule } from './entities/module.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const mockCourse = {
  id: 'course-uuid',
  tenantId: 'tenant-uuid',
  title: 'English for Beginners',
  slug: 'english-beginners',
  status: 'published',
  price: 500000,
  currency: 'UZS',
};

describe('CoursesService', () => {
  let service: CoursesService;
  let coursesRepo: jest.Mocked<CoursesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: CoursesRepository,
          useValue: {
            findPaginated: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getStudentProgress: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(CourseModule),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { query: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    coursesRepo = module.get(CoursesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated courses', async () => {
      coursesRepo.findPaginated.mockResolvedValue([[mockCourse as any], 1]);
      const result = await service.findAll('tenant-uuid', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return course by id', async () => {
      coursesRepo.findOne.mockResolvedValue(mockCourse as any);
      const result = await service.findOne('course-uuid', 'tenant-uuid');
      expect(result.title).toBe('English for Beginners');
    });

    it('should throw NotFoundException for missing course', async () => {
      coursesRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish a course', async () => {
      coursesRepo.findOne.mockResolvedValue(mockCourse as any);
      coursesRepo.update = jest.fn().mockResolvedValue({});
      const result = await service.publish('course-uuid', 'tenant-uuid');
      expect(result.message).toBe('Course published');
    });
  });

  describe('getProgress', () => {
    it('should return student progress in course', async () => {
      coursesRepo.findOne.mockResolvedValue(mockCourse as any);
      coursesRepo.getStudentProgress.mockResolvedValue({ progressPercent: 75, lessonsCompleted: 3 });
      const result = await service.getProgress('course-uuid', 'student-uuid', 'tenant-uuid');
      expect(result).toHaveProperty('progressPercent');
    });
  });
});
