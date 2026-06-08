import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeachers1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teachers" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "teacher_code" varchar(50) NOT NULL,
        "specialization" text[],
        "qualifications" text,
        "bio" text,
        "salary" decimal(12,2),
        "salary_type" varchar(50) DEFAULT 'monthly',
        "hire_date" date,
        "contract_end_date" date,
        "is_active" boolean DEFAULT true,
        "branch" varchar(100),
        "working_hours" jsonb,
        "rating" decimal(3,2) DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_teachers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_teachers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_teachers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "teachers"`);
  }
}
