import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFields1700000000020 implements MigrationInterface {
  name = 'AddPaymentFields1700000000020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" varchar`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tax_percent" decimal(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "is_recurring" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "recurring_interval" varchar CHECK (recurring_interval IN ('monthly', 'annual'))`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "next_billing_date" timestamp`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_amount" decimal(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_reason" varchar`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refunded_at" timestamp`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_url" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripe_payment_intent_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "stripe_customer_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "tax_percent"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "is_recurring"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "recurring_interval"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "next_billing_date"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "refunded_amount"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "refund_reason"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "refunded_at"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "invoice_url"`);
  }
}
