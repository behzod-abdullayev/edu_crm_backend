import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(50),
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "middle_name" varchar(100),
        "username" varchar(100),
        "password_hash" varchar(255) NOT NULL DEFAULT '',
        "refresh_token_hash" varchar(255),
        "reset_password_token" varchar(255),
        "reset_password_expires" timestamp,
        "role" varchar(50) DEFAULT 'student',
        "status" varchar(50) DEFAULT 'active',
        "avatar" varchar(500),
        "date_of_birth" date,
        "gender" varchar(20),
        "address" text,
        "city" varchar(100),
        "country" varchar(100),
        "language" varchar(10) DEFAULT 'en',
        "timezone" varchar(100) DEFAULT 'UTC',
        "two_factor_enabled" boolean DEFAULT false,
        "two_factor_secret" varchar(255),
        "login_attempts" int DEFAULT 0,
        "locked_until" timestamp,
        "last_login_at" timestamp,
        "last_login_ip" varchar(50),
        "email_verified" boolean DEFAULT false,
        "email_verification_token" varchar(255),
        "branch" varchar(255),
        "created_by" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "deleted_at" timestamp,
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
