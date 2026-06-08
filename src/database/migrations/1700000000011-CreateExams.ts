import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExams1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exams" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "group_id" uuid,
        "teacher_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "type" varchar(50) DEFAULT 'quiz',
        "duration" int NOT NULL,
        "max_score" decimal(8,2) DEFAULT 100,
        "passing_score" decimal(8,2) DEFAULT 60,
        "start_at" timestamp,
        "end_at" timestamp,
        "timezone" varchar(100) DEFAULT 'UTC',
        "is_published" boolean DEFAULT false,
        "shuffle_questions" boolean DEFAULT false,
        "show_results" varchar(50) DEFAULT 'after_end',
        "attempts" int DEFAULT 1,
        "instructions" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_exams" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "exam_questions" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "exam_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "text" text NOT NULL,
        "type" varchar(50) NOT NULL,
        "options" jsonb,
        "correct_answer" text,
        "points" decimal(8,2) DEFAULT 1,
        "order" int DEFAULT 0,
        "explanation" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_exam_questions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_questions_exam" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "exam_results" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "exam_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "attempt_number" int DEFAULT 1,
        "started_at" timestamp,
        "submitted_at" timestamp,
        "answers" jsonb,
        "auto_score" decimal(8,2),
        "manual_score" decimal(8,2),
        "total_score" decimal(8,2),
        "is_passed" boolean,
        "feedback" text,
        "graded_by" uuid,
        "graded_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_exam_results" PRIMARY KEY ("id"),
        CONSTRAINT "fk_results_exam" FOREIGN KEY ("exam_id") REFERENCES "exams"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exams"`);
  }
}
