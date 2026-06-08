import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendance1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendances" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "schedule_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "teacher_id" uuid,
        "group_id" uuid,
        "status" varchar(50) NOT NULL DEFAULT 'present',
        "late_minutes" int DEFAULT 0,
        "notes" text,
        "marked_at" timestamp DEFAULT now(),
        "marked_by" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_attendances" PRIMARY KEY ("id"),
        CONSTRAINT "fk_att_schedule" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id"),
        CONSTRAINT "fk_att_student" FOREIGN KEY ("student_id") REFERENCES "students"("id"),
        CONSTRAINT "fk_att_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attendances"`);
  }
}
