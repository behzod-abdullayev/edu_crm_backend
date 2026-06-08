import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL,
        "domain" varchar(255),
        "logo_url" varchar(500),
        "favicon_url" varchar(500),
        "primary_color" varchar(20),
        "secondary_color" varchar(20),
        "contact_email" varchar(255),
        "contact_phone" varchar(50),
        "address" text,
        "country" varchar(100),
        "timezone" varchar(100) DEFAULT 'UTC',
        "default_language" varchar(10) DEFAULT 'en',
        "currency" varchar(10) DEFAULT 'USD',
        "subscription_plan" varchar(50) DEFAULT 'free',
        "subscription_status" varchar(50) DEFAULT 'active',
        "subscription_expires_at" timestamp,
        "max_students" int DEFAULT 100,
        "max_teachers" int DEFAULT 10,
        "max_branches" int DEFAULT 1,
        "feature_flags" jsonb DEFAULT '{}',
        "branches" jsonb DEFAULT '[]',
        "theme" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "uq_tenants_slug" UNIQUE ("slug")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
