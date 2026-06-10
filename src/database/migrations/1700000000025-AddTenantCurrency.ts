import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantCurrency1700000000025 implements MigrationInterface {
  name = 'AddTenantCurrency1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'UZS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS currency
    `);
  }
}
