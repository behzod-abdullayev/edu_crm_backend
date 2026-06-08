# EduCRM Backend

Enterprise-grade CRM + LMS backend for educational centers built with NestJS + PostgreSQL.

## Features

- **Multi-tenancy** — complete tenant isolation with feature flags and plan limits
- **RBAC** — custom roles with granular permissions per tenant
- **Students & Teachers** — full profile management with auto-generated codes
- **Courses & LMS** — modules, lessons, enrollments, progress tracking
- **Groups & Schedules** — bulk schedule generation, calendar view
- **Attendance** — single and bulk marking, reports
- **Homework** — assignment, submission, grading workflow
- **Exams** — question bank, auto-grading, manual grading for essays
- **Payments** — invoices, discounts, Stripe webhook, PDF receipts, overdue detection
- **Certificates** — PDF generation with QR code, public verification endpoint
- **Real-time Chat** — WebSocket gateway with per-tenant room isolation
- **Analytics** — dashboard KPIs, financial, attendance, course, teacher analytics + Excel/CSV export
- **Notifications** — in-app, email (Handlebars templates), event-driven listener
- **Files** — local and S3 storage providers, signed URLs
- **Audit Logs** — full action trail per tenant
- **Scheduled Jobs** — overdue payments, analytics snapshots, daily reminders
- **2FA** — TOTP via speakeasy with QR code
- **Security** — Helmet, Throttler, account lockout, JWT rotation

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

## Installation

```bash
# 1. Clone and install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials and secrets

# 3. Run migrations
npm run migration:run

# 4. Seed initial data
npm run seed

# 5. Start development server
npm run start:dev
```

## Environment Setup

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host (default: localhost) |
| `DB_PASSWORD` | Database password |
| `JWT_ACCESS_SECRET` | Min 32 chars random string |
| `JWT_REFRESH_SECRET` | Min 32 chars random string |
| `MAIL_USER` | SMTP email user |
| `STORAGE_PROVIDER` | `local` or `s3` |

## Database Commands

```bash
# Run all pending migrations
npm run migration:run

# Generate new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Revert last migration
npm run migration:revert

# Seed demo data
npm run seed
```

## Start Commands

```bash
# Development (hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Type check only
npm run typecheck
```

## Docker

```bash
# Start all services (app + postgres)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## API Documentation

Swagger UI available at: `http://localhost:4001/docs` (development only)

All endpoints require:
- `Authorization: Bearer <access_token>` header
- `X-Tenant-ID: <tenant_uuid>` header (for tenant-aware endpoints)

## Module Overview

| Module | Endpoints | Description |
|---|---|---|
| auth | 10 | Login, refresh, 2FA, password reset |
| users | 6 | User CRUD, profile management |
| tenants | 7 | Tenant management (super admin) |
| roles | 5 | Custom RBAC roles |
| students | 10 | Student profiles, performance, schedule |
| teachers | 7 | Teacher profiles, stats |
| courses | 8 | Course, modules, lessons, enrollment |
| groups | 5 | Group management |
| schedules | 7 | Calendar, bulk generation, cancel |
| attendance | 5 | Mark, bulk, reports |
| homework | 5 | Assign, submit, grade |
| exams | 6 | Create, start, submit, grade |
| payments | 9 | Invoices, Stripe, PDF, reports |
| certificates | 4 | Generate PDF, verify (public) |
| chat | 4 REST + WebSocket | Rooms, messages, real-time |
| analytics | 8 | Overview, financial, Excel/CSV export |
| notifications | 7 | In-app, email, bulk send |
| files | 5 | Upload, download, delete (local/S3) |
| admin | 8 | Operations dashboard |
| owner | 10 | HR, branches, config, audit |
| audit | 2 | Paginated audit trail |
| health | 3 | Liveness, readiness, status |

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Super Admin | super@educrm.com | Admin1234! |
| Admin | admin@demo-school.com | Admin1234! |
| Teacher | teacher1@demo-school.com | Admin1234! |
| Student | student1@demo-school.com | Admin1234! |

## Folder Structure

```
src/
├── @types/             # Global type declarations
├── common/             # Guards, pipes, decorators, interceptors
├── config/             # App, DB, JWT, mail, storage configs
├── database/           # Migrations (18 files) + seeds
├── mail/               # Mail module + Handlebars templates
├── modules/            # 22 feature modules
│   ├── admin/          # Operations dashboard
│   ├── analytics/      # KPI analytics + export
│   ├── attendance/     # Attendance tracking
│   ├── auth/           # JWT auth + 2FA
│   ├── certificates/   # PDF certificate generation
│   ├── chat/           # WebSocket chat
│   ├── courses/        # Course + LMS
│   ├── exams/          # Exam engine
│   ├── files/          # File upload (local/S3)
│   ├── groups/         # Group management
│   ├── health/         # Health checks
│   ├── homework/       # Homework workflow
│   ├── notifications/  # Event-driven notifications
│   ├── owner/          # Owner portal
│   ├── payments/       # Payment processing
│   ├── roles/          # RBAC
│   ├── schedules/      # Calendar & scheduling
│   ├── scheduler/      # Cron jobs
│   ├── students/       # Student management
│   ├── teachers/       # Teacher management
│   ├── tenants/        # Multi-tenancy
│   └── users/          # User management
└── shared/             # Shared enums, DTOs, entities
```

## New Features (v1.17 → v1.0 Complete)

### Internationalization (i18n)
- Supported languages: **English (en)**, **Russian (ru)**, **Uzbek (uz)**
- Set language via query param `?lang=uz`, `Accept-Language` header, or `x-custom-lang` header
- Default language configured via `DEFAULT_LANGUAGE` env variable (default: `en`)
- Translation files in `src/i18n/{lang}/common.json`

### Dual Storage Provider
- `STORAGE_PROVIDER=local` — saves files to local disk (default)
- `STORAGE_PROVIDER=s3` — saves files to AWS S3
- Configure `UPLOADS_MAX_SIZE_MB` and `UPLOADS_ALLOWED_TYPES` in env

### Notification Templates
- Per-tenant customizable notification templates with Handlebars support
- API: `GET/POST /api/v1/notifications/templates`, `PATCH/DELETE /api/v1/notifications/templates/:id`
- Default templates seeded: `payment.created`, `homework.assigned`, `exam.published`

### Account Lockout
- After **5 failed login attempts**, account is locked for **15 minutes**
- Lockout info stored in `login_attempts` and `locked_until` columns

### Analytics Export
- `GET /api/v1/analytics/export/excel?type=students|attendance|payments|teachers`
- `GET /api/v1/analytics/export/csv?type=students|attendance|payments|teachers`

### Role Management
- `POST /api/v1/roles/:id/assign` — assign role to user
- `POST /api/v1/roles/:id/revoke` — revoke role from user
- `GET /api/v1/roles/:id/users` — list users with role

### New Migrations
- `1700000000019` — CreateNotificationTemplates
- `1700000000020` — AddPaymentFields (Stripe, recurring, refund, invoice)
- `1700000000021` — AddUserLockoutFields
