import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "type" varchar(100) NOT NULL,
        "event_type" varchar(100),
        "channel" varchar(50) DEFAULT 'in_app',
        "title" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "data" jsonb DEFAULT '{}',
        "status" varchar(50) DEFAULT 'pending',
        "read_at" timestamp,
        "sent_at" timestamp,
        "failure_reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notif_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_notif_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "name" varchar(200) NOT NULL,
        "email_subject" varchar(255),
        "email_body" text,
        "sms_body" text,
        "in_app_title" varchar(255),
        "in_app_body" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_notif_templates" PRIMARY KEY ("id"),
        CONSTRAINT "uq_template_key" UNIQUE ("tenant_id", "key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
