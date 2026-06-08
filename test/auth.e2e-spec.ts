import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { default as request } from 'supertest';
import { AppModule } from '../src/app.module';
import { Test, TestingModule } from '@nestjs/testing';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => { await app.close(); });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('returns 400 when required fields missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'incomplete@test.com' })
        .expect(400);
    });

    it('returns 400 when password too weak', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ firstName: 'Test', lastName: 'User', email: 'test@test.com', password: 'weak' })
        .expect(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'notexist@test.com', password: 'WrongPass1!' })
        .expect(401);
    });

    it('returns 400 when fields missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);
    });

    it('returns 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Password1!' })
        .expect(400);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'totally-invalid-token' })
        .expect(401);
    });

    it('returns 400 when refreshToken field missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ─── Forgot Password ───────────────────────────────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 regardless of whether email exists (security)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@nonexistent.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('returns 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  // ─── Protected endpoint ────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when no token provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('returns 401 for malformed bearer token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('returns 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  // ─── Verify OTP ────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/verify-otp', () => {
    it('returns 400 for invalid OTP', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'test@test.com', otp: 'wrong' })
        .expect(400);
    });
  });
});
