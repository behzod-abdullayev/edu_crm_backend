import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoles1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "custom_roles" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "permissions" text[],
        "is_active" boolean DEFAULT true,
        "is_system" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_custom_roles" PRIMARY KEY ("id"),
        CONSTRAINT "fk_roles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "custom_roles"`);
  }
}
