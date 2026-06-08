import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole, UserStatus } from '../../shared/enums';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.findOne({ where: { email, tenantId } });
  }

  async findByEmailWithPassword(email: string, tenantId: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.refreshToken')
      .where('user.email = :email AND user.tenantId = :tenantId', { email, tenantId })
      .getOne();
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.createQueryBuilder('user')
      .where('user.otpCode = :token', { token })
      .getOne();
  }

  async findPaginated(
    tenantId: string,
    page: number,
    limit: number,
    search?: string,
    role?: UserRole,
    status?: UserStatus,
  ): Promise<[User[], number]> {
    const qb = this.createQueryBuilder('user').where('user.tenantId = :tenantId', { tenantId });
    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (role) qb.andWhere('user.role = :role', { role });
    if (status) qb.andWhere('user.status = :status', { status });
    return qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    await this.increment({ id: userId }, 'loginAttempts' as any, 1);
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await this.update(userId, { loginAttempts: 0 } as any);
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    await this.update(userId, { lockedUntil: until } as any);
  }
}
