import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillMissingStudentRecords1700000000026 implements MigrationInterface {
  name = 'BackfillMissingStudentRecords1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // OBS-08: some users were created with role='student' (via seeds or
    // self-registration) without a matching row in `students`. Every
    // owner-panel aggregation (branch counts, analytics, finances) reads from
    // `students`, so these users were invisible to all of them. Backfill one
    // `students` row per orphaned student user, continuing the per-tenant
    // STU-NNNNN sequence and copying their existing branch assignment.
    // NOTE: students.tenant_id is character varying while users.tenant_id is
    // uuid (schema drift from an earlier synchronize:true run) — cast to text.
    await queryRunner.query(`
      INSERT INTO students (user_id, tenant_id, student_code, enrollment_date, branch, created_at, updated_at)
      SELECT
        u.id,
        u.tenant_id::text,
        'STU-' || LPAD(
          (
            ROW_NUMBER() OVER (PARTITION BY u.tenant_id ORDER BY u.created_at)
            + (SELECT COUNT(*) FROM students s2 WHERE s2.tenant_id = u.tenant_id::text)
          )::text,
          5, '0'
        ),
        COALESCE(u.created_at::date, CURRENT_DATE),
        u.branch,
        NOW(),
        NOW()
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.role = 'student' AND u.deleted_at IS NULL AND s.id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data backfill — not reversed. Removing these rows would silently break
    // any payments/attendance/grades created against them after this migration ran.
    void queryRunner;
  }
}
