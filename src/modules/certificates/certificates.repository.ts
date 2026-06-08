import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';

@Injectable()
export class CertificatesRepository extends Repository<Certificate> {
  constructor(private dataSource: DataSource) {
    super(Certificate, dataSource.createEntityManager());
  }

  async findByStudent(studentId: string, tenantId: string): Promise<Certificate[]> {
    return this.find({ where: { studentId, tenantId }, order: { issuedAt: 'DESC' } });
  }

  async getNextCertificateNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM certificates WHERE tenant_id = $1 AND EXTRACT(YEAR FROM issued_at) = $2`,
      [tenantId, year],
    );
    const seq = parseInt(result[0].count, 10) + 1;
    return `CERT-${year}-${String(seq).padStart(4, '0')}`;
  }
}
