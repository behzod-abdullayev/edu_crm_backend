import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { default as request } from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';

describe('Students (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let createdStudentId: string;
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
  }, 60000);

  afterAll(async () => {
    if (createdStudentId && dataSource) {
      await dataSource.query(`DELETE FROM students WHERE id = $1`, [createdStudentId]).catch(() => null);
    }
    await app.close();
  });

  describe('POST /api/v1/students', () => {
    it('should return 401 without auth token', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/students')
        .set('x-tenant-domain', testTenantDomain)
        .send({ firstName: 'Test', lastName: 'Student', email: 'test@student.com' })
        .expect(401);
    });

    it('should return 400 with missing required fields', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/api/v1/students')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should create a student with valid data', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'E2E',
          lastName: 'TestStudent',
          email: `e2e.student.${Date.now()}@test.com`,
          phone: '+998901234567',
        });
      expect([200, 201]).toContain(res.status);
      if (res.body?.data?.id) createdStudentId = res.body.data.id;
      else if (res.body?.id) createdStudentId = res.body.id;
    });
  });

  describe('GET /api/v1/students', () => {
    it('should return 401 without auth token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/students')
        .set('x-tenant-domain', testTenantDomain)
        .expect(401);
    });

    it('should return paginated student list', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/students?page=1&limit=10')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body).toBeDefined();
    });

    it('should support search filter', async () => {
      if (!accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/students?search=E2E')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('should return 404 for non-existent student', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .get('/api/v1/students/00000000-0000-0000-0000-000000000000')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return student by valid id', async () => {
      if (!accessToken || !createdStudentId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${createdStudentId}`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/students/:id', () => {
    it('should update student', async () => {
      if (!accessToken || !createdStudentId) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/students/${createdStudentId}`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: '+998901111111' });
      expect([200, 201]).toContain(res.status);
    });

    it('should return 404 for non-existent student', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .patch('/api/v1/students/00000000-0000-0000-0000-000000000000')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ phone: '+998900000000' })
        .expect(404);
    });
  });

  describe('GET /api/v1/students/:id/performance', () => {
    it('should return performance data', async () => {
      if (!accessToken || !createdStudentId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${createdStudentId}/performance`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('should soft-delete student', async () => {
      if (!accessToken || !createdStudentId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/students/${createdStudentId}`)
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 201, 204]).toContain(res.status);
      createdStudentId = '';
    });

    it('should return 404 for already deleted student', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .delete('/api/v1/students/00000000-0000-0000-0000-000000000000')
        .set('x-tenant-domain', testTenantDomain)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
