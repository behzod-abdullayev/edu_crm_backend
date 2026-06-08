import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON teachers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
      CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id, status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_tenant_email;
      DROP INDEX IF EXISTS idx_users_role;
      DROP INDEX IF EXISTS idx_students_tenant;
      DROP INDEX IF EXISTS idx_teachers_tenant;
      DROP INDEX IF EXISTS idx_attendance_student_date;
      DROP INDEX IF EXISTS idx_payments_student;
      DROP INDEX IF EXISTS idx_notifications_user;
      DROP INDEX IF EXISTS idx_audit_logs_tenant;
    `);
  }
}
