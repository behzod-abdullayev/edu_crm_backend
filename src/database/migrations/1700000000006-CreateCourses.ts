import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourses1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "slug" varchar(250) NOT NULL,
        "status" varchar(50) DEFAULT 'draft',
        "level" varchar(50) DEFAULT 'beginner',
        "price" decimal(12,2) DEFAULT 0,
        "currency" varchar(10) DEFAULT 'USD',
        "duration_weeks" int,
        "lessons_per_week" int,
        "lesson_duration_minutes" int,
        "tags" text[],
        "cover_image" varchar(500),
        "language" varchar(10) DEFAULT 'en',
        "teacher_id" uuid,
        "max_students" int DEFAULT 30,
        "syllabus" jsonb,
        "requirements" text[],
        "outcomes" text[],
        "enrollment_count" int DEFAULT 0,
        "completion_rate" decimal(5,2) DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_courses" PRIMARY KEY ("id"),
        CONSTRAINT "fk_courses_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id"),
        CONSTRAINT "fk_courses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "course_modules" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "course_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "order" int DEFAULT 0,
        "is_published" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_course_modules" PRIMARY KEY ("id"),
        CONSTRAINT "fk_modules_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "lessons" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "course_id" uuid NOT NULL,
        "module_id" uuid,
        "title" varchar(200) NOT NULL,
        "content" text,
        "type" varchar(50) DEFAULT 'text',
        "order" int DEFAULT 0,
        "video_url" varchar(500),
        "video_duration" int,
        "attachments" jsonb,
        "is_published" boolean DEFAULT false,
        "is_free" boolean DEFAULT false,
        "scheduled_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_lessons" PRIMARY KEY ("id"),
        CONSTRAINT "fk_lessons_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "group_id" uuid,
        "tenant_id" uuid NOT NULL,
        "status" varchar(50) DEFAULT 'active',
        "enrolled_at" timestamp DEFAULT now(),
        "completed_at" timestamp,
        "progress_percent" decimal(5,2) DEFAULT 0,
        "last_accessed_at" timestamp,
        "lessons_completed" int DEFAULT 0,
        "total_lessons" int DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_enrollments_student" FOREIGN KEY ("student_id") REFERENCES "students"("id"),
        CONSTRAINT "fk_enrollments_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lessons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "course_modules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses"`);
  }
}
