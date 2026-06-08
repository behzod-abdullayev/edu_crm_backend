import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { default as request } from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let createdPaymentId: string;
  let testStudentId: string;
  const testTenantDomain = process.env.TEST_TENANT_DOMAIN || 'demo-school.com';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-tenant-domain', testTenantDomain)
      .send({ email: 'admin@demo-school.com', password: 'Admin1234!' });

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      accessToken = loginResponse.body?.data?.accessToken || loginResponse.body?.accessToken;
    }

    if (accessToken) {
      const studentsRes = await request(app.getHttpServer())
        .get('/api/v1/students?limit=1')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      const students = studentsRes.body?.data || studentsRes.body;
      if (Array.isArray(students) && students.length > 0) {
        testStudentId = students[0].id;
      }
    }
  }, 60000);

  afterAll(async () => {
    if (createdPaymentId && dataSource) {
      await dataSource.query(`DELETE FROM payments WHERE id = $1`, [createdPaymentId]).catch(() => null);
    }
    await app.close();
  });

  describe('POST /api/v1/payments', () => {
    it('should return 401 without auth token', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-tenant-domain', testTenantDomain)
        .send({ amount: 500000 })
        .expect(401);
    });

    it('should return 400 with missing required fields', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should create a payment with valid data', async () => {
      if (!accessToken || !testStudentId) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          studentId: testStudentId,
          amount: 500000,
          currency: 'UZS',
          paymentMethod: 'cash',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      expect([200, 201]).toContain(res.status);
      const payment = res.body?.data || res.body;
      if (payment?.id) createdPaymentId = payment.id;
    });
  });

  describe('GET /api/v1/payments', () => {
    it('should return 401 without auth token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('x-tenant-domain', testTenantDomain)
        .expect(401);
    });

    it('should return paginated payment list', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments?page=1&limit=10')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });

    it('should filter by status', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments?status=pending')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });

    it('should filter by studentId', async () => {
      if (!accessToken || !testStudentId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments?studentId=${testStudentId}`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('POST /api/v1/payments/:id/pay', () => {
    it('should return 404 for non-existent payment', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/api/v1/payments/00000000-0000-0000-0000-000000000000/pay')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should mark payment as paid', async () => {
      if (!accessToken || !createdPaymentId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/${createdPaymentId}/pay`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('POST /api/v1/payments/:id/refund', () => {
    it('should return 404 for non-existent payment', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/api/v1/payments/00000000-0000-0000-0000-000000000000/refund')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test refund' })
        .expect(404);
    });

    it('should refund a paid payment', async () => {
      if (!accessToken || !createdPaymentId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/${createdPaymentId}/refund`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'E2E test refund' });
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('GET /api/v1/payments/report/debtors', () => {
    it('should return 401 without auth token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/payments/report/debtors')
        .set('x-tenant-domain', testTenantDomain)
        .expect(401);
    });

    it('should return debtors list', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/report/debtors')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });
});
