import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedules1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "group_id" uuid,
        "teacher_id" uuid,
        "course_id" uuid,
        "date" date NOT NULL,
        "start_time" varchar(10) NOT NULL,
        "end_time" varchar(10) NOT NULL,
        "timezone" varchar(100) DEFAULT 'UTC',
        "classroom" varchar(100),
        "online_link" varchar(500),
        "type" varchar(50) DEFAULT 'regular',
        "status" varchar(50) DEFAULT 'scheduled',
        "notes" text,
        "cancel_reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "fk_schedules_group" FOREIGN KEY ("group_id") REFERENCES "groups"("id"),
        CONSTRAINT "fk_schedules_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id"),
        CONSTRAINT "fk_schedules_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "schedules"`);
  }
}
