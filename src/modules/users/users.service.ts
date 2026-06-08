import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { PaginatedResult } from '../../shared/dtos/pagination.dto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserRole, UserStatus } from '../../shared/enums';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async findAll(tenantId: string, query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await this.usersRepository.findPaginated(
      tenantId, Number(page), Number(limit), query.search, query.role, query.status as UserStatus | undefined,
    );
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email, tenantId);
  }

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email, tenantId);
    if (existing) throw new ConflictException('User with this email already exists');
    // Do NOT manually hash here — @BeforeInsert on User entity handles it
    const user = this.usersRepository.create({ ...dto, tenantId });
    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<User> {
    await this.findOne(id, tenantId);
    await this.usersRepository.update(id, dto as any);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.usersRepository.softDelete(id);
  }

  async updateProfile(id: string, dto: UpdateProfileDto, tenantId: string): Promise<User> {
    await this.findOne(id, tenantId);
    await this.usersRepository.update(id, dto as any);
    return this.findOne(id, tenantId);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new ConflictException('Current password is incorrect');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update(id, { password: hashed } as any);
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date(), lastLoginIp: ip } as any);
  }

  async incrementLoginAttempts(id: string): Promise<number> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const attempts = (user.loginAttempts ?? 0) + 1;
    await this.usersRepository.update(id, { loginAttempts: attempts } as any);
    return attempts;
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    await this.usersRepository.update(id, { lockedUntil: until, status: UserStatus.BLOCKED } as any);
  }

  async unlockAccount(id: string): Promise<void> {
    await this.usersRepository.update(id, { lockedUntil: null, loginAttempts: 0, status: UserStatus.ACTIVE } as any);
  }

  async updateRefreshToken(id: string, hashedToken: string | null): Promise<void> {
    await this.usersRepository.update(id, { refreshToken: hashedToken ?? '' } as any);
  }

  async updateStatus(id: string, tenantId: string, status: UserStatus): Promise<User> {
    await this.findOne(id, tenantId);
    await this.usersRepository.update(id, { status } as any);
    return this.findOne(id, tenantId);
  }

  async updateRole(id: string, tenantId: string, role: UserRole): Promise<User> {
    await this.findOne(id, tenantId);
    await this.usersRepository.update(id, { role } as any);
    return this.findOne(id, tenantId);
  }
}
