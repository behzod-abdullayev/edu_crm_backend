import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCertificates1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "teacher_id" uuid,
        "certificate_number" varchar(100) NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "issued_at" timestamp DEFAULT now() NOT NULL,
        "expires_at" timestamp,
        "template_id" uuid,
        "pdf_url" varchar(500),
        "qr_code_url" varchar(500),
        "metadata" jsonb DEFAULT '{}',
        "is_revoked" boolean DEFAULT false,
        "revoked_at" timestamp,
        "revoke_reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_certificates" PRIMARY KEY ("id"),
        CONSTRAINT "uq_cert_number" UNIQUE ("certificate_number"),
        CONSTRAINT "fk_cert_student" FOREIGN KEY ("student_id") REFERENCES "students"("id"),
        CONSTRAINT "fk_cert_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id"),
        CONSTRAINT "fk_cert_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "certificates"`);
  }
}
