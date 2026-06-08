import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { File } from './entities/file.entity';

@Injectable()
export class FilesRepository extends Repository<File> {
  constructor(private dataSource: DataSource) {
    super(File, dataSource.createEntityManager());
  }

  async findPaginated(tenantId: string, page: number, limit: number, type?: string, uploaderId?: string): Promise<[File[], number]> {
    const qb = this.createQueryBuilder('file').where('file.tenantId = :tenantId', { tenantId });
    if (type) qb.andWhere('file.type = :type', { type });
    if (uploaderId) qb.andWhere('file.uploaderUserId = :uploaderId', { uploaderId });
    return qb.orderBy('file.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
  }
}
