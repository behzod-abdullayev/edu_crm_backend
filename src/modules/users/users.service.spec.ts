import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { NotFoundException } from '@nestjs/common';

const mockUser = {
  id: 'user-uuid',
  tenantId: 'tenant-uuid',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'student',
  status: 'active',
};

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findPaginated: jest.fn(),
            findOne: jest.fn(),
            findByEmail: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepo = module.get(UsersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      usersRepo.findPaginated.mockResolvedValue([[mockUser as any], 1]);
      const result = await service.findAll('tenant-uuid', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser as any);
      const result = await service.findOne('user-uuid', 'tenant-uuid');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-id')).rejects.toThrow(NotFoundException);
    });
  });
});
