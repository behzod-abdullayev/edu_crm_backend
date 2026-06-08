import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid,
        "action" varchar(100) NOT NULL,
        "entity" varchar(100),
        "entity_id" uuid,
        "old_value" jsonb,
        "new_value" jsonb,
        "ip_address" varchar(50),
        "user_agent" text,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "analytics_snapshots" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "date" date NOT NULL,
        "type" varchar(100) NOT NULL,
        "data" jsonb DEFAULT '{}',
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_analytics_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "uq_snapshot" UNIQUE ("tenant_id", "date", "type")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
