import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDiscounts1700000000022 implements MigrationInterface {
  name = 'CreateDiscounts1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
        value DECIMAL(10,2) NOT NULL,
        valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
        valid_until TIMESTAMP,
        max_uses INT,
        used_count INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        applicable_course_ids JSONB,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        UNIQUE(tenant_id, code)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_tenant_code ON discounts(tenant_id, code)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active, valid_until)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discounts_tenant_id ON discounts(tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discounts_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discounts_tenant_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discounts_tenant_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS discounts`);
  }
}
