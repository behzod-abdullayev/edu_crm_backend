import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFiles1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "uploader_user_id" uuid NOT NULL,
        "filename" varchar(500) NOT NULL,
        "stored_name" varchar(500) NOT NULL,
        "key" varchar(1000) NOT NULL,
        "url" varchar(1000),
        "mime_type" varchar(200) NOT NULL,
        "size" bigint NOT NULL,
        "type" varchar(50) DEFAULT 'other',
        "storage_provider" varchar(50) DEFAULT 'local',
        "linked_entity_type" varchar(100),
        "linked_entity_id" uuid,
        "is_public" boolean DEFAULT false,
        "access_roles" jsonb,
        "expires_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_files" PRIMARY KEY ("id"),
        CONSTRAINT "fk_files_user" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_files_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "files"`);
  }
}
