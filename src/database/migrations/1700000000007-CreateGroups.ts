import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroups1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "max_students" int DEFAULT 30,
        "current_count" int DEFAULT 0,
        "branch" varchar(100),
        "start_date" date,
        "end_date" date,
        "is_active" boolean DEFAULT true,
        "schedule_template" jsonb DEFAULT '[]',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_groups_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id"),
        CONSTRAINT "fk_groups_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id"),
        CONSTRAINT "fk_groups_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "groups"`);
  }
}
