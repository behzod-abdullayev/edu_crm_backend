import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_tenant_email ON users (tenant_id, email) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_users_tenant_role ON users (tenant_id, role)`);
    await queryRunner.query(`CREATE INDEX idx_students_tenant ON students (tenant_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_students_tenant_code ON students (tenant_id, student_code)`);
    await queryRunner.query(`CREATE INDEX idx_payments_tenant_status ON payments (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_payments_student ON payments (student_id)`);
    await queryRunner.query(`CREATE INDEX idx_payments_due_date ON payments (due_date) WHERE status = 'pending'`);
    await queryRunner.query(`CREATE INDEX idx_attendance_schedule ON attendances (schedule_id)`);
    await queryRunner.query(`CREATE INDEX idx_attendance_student ON attendances (student_id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications (user_id, tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_schedules_date ON schedules (date, tenant_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at)`);
    await queryRunner.query(`CREATE INDEX idx_chat_messages_room ON chat_messages (room_id, created_at)`);
    await queryRunner.query(`CREATE INDEX idx_enrollments_student_course ON enrollments (student_id, course_id)`);
    await queryRunner.query(`CREATE INDEX idx_courses_tenant_status ON courses (tenant_id, status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'idx_users_tenant_email', 'idx_users_tenant_role', 'idx_students_tenant',
      'idx_students_tenant_code', 'idx_payments_tenant_status', 'idx_payments_student',
      'idx_payments_due_date', 'idx_attendance_schedule', 'idx_attendance_student',
      'idx_notifications_user', 'idx_schedules_date', 'idx_audit_logs_tenant_created',
      'idx_chat_messages_room', 'idx_enrollments_student_course', 'idx_courses_tenant_status',
    ];
    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx}`);
    }
  }
}
