import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificateQrUrl1700000000024 implements MigrationInterface {
  name = 'AddCertificateQrUrl1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE certificates DROP COLUMN IF EXISTS qr_code_url
    `);
  }
}
