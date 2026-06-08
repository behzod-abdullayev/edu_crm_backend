import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoices1700000000023 implements MigrationInterface {
  name = 'CreateInvoices1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        student_id UUID NOT NULL,
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
        due_date TIMESTAMP NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(20) NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
        pdf_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_student_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_payment_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_tenant_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices`);
  }
}
