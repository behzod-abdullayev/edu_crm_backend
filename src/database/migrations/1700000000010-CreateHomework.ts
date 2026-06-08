import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHomework1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "homeworks" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "group_id" uuid,
        "teacher_id" uuid NOT NULL,
        "lesson_id" uuid,
        "title" varchar(200) NOT NULL,
        "description" text,
        "instructions" text,
        "attachments" jsonb,
        "due_date" timestamp NOT NULL,
        "max_score" decimal(8,2) DEFAULT 100,
        "status" varchar(50) DEFAULT 'active',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_homeworks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "homework_submissions" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "homework_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "content" text,
        "attachments" jsonb,
        "submitted_at" timestamp,
        "status" varchar(50) DEFAULT 'assigned',
        "score" decimal(8,2),
        "feedback" text,
        "graded_at" timestamp,
        "graded_by" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_hw_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sub_homework" FOREIGN KEY ("homework_id") REFERENCES "homeworks"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sub_student" FOREIGN KEY ("student_id") REFERENCES "students"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "homework_submissions"`);
    await queryRunner.query(`DROP TABLE "homeworks"`);
  }
}
