import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudents1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "students" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "student_code" varchar(50) NOT NULL,
        "parent_name" varchar(200),
        "parent_phone" varchar(50),
        "parent_email" varchar(255),
        "emergency_contact" varchar(500),
        "enrollment_date" date,
        "graduation_date" date,
        "is_scholarship" boolean DEFAULT false,
        "scholarship_percent" decimal(5,2) DEFAULT 0,
        "balance" decimal(12,2) DEFAULT 0,
        "debt_amount" decimal(12,2) DEFAULT 0,
        "total_paid" decimal(12,2) DEFAULT 0,
        "overall_gpa" decimal(5,2) DEFAULT 0,
        "total_attendance_percent" decimal(5,2) DEFAULT 0,
        "branch" varchar(100),
        "notes" text,
        "tags" text[],
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_students" PRIMARY KEY ("id"),
        CONSTRAINT "fk_students_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_students_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "students"`);
  }
}
