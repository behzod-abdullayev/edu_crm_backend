import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1700000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "course_id" uuid,
        "group_id" uuid,
        "invoice_number" varchar(100) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) DEFAULT 'USD',
        "discount_percent" decimal(5,2) DEFAULT 0,
        "discount_amount" decimal(12,2) DEFAULT 0,
        "tax_percent" decimal(5,2) DEFAULT 0,
        "tax_amount" decimal(12,2) DEFAULT 0,
        "total_amount" decimal(12,2) NOT NULL,
        "status" varchar(50) DEFAULT 'pending',
        "method" varchar(50) DEFAULT 'cash',
        "stripe_payment_intent_id" varchar(255),
        "stripe_customer_id" varchar(255),
        "paid_at" timestamp,
        "due_date" date,
        "description" text,
        "notes" text,
        "receipt_url" varchar(500),
        "invoice_url" varchar(500),
        "is_recurring" boolean DEFAULT false,
        "recurring_interval" varchar(50),
        "next_billing_date" date,
        "refunded_amount" decimal(12,2) DEFAULT 0,
        "refund_reason" text,
        "refunded_at" timestamp,
        "created_by" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_invoice_number" UNIQUE ("invoice_number"),
        CONSTRAINT "fk_payments_student" FOREIGN KEY ("student_id") REFERENCES "students"("id"),
        CONSTRAINT "fk_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "discounts" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "code" varchar(100) NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "type" varchar(50) NOT NULL,
        "value" decimal(10,2) NOT NULL,
        "valid_from" date,
        "valid_until" date,
        "max_uses" int,
        "used_count" int DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "applicable_course_ids" uuid[],
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_discounts" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "discounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
  }
}
