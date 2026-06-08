import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLockoutFields1700000000021 implements MigrationInterface {
  name = 'AddUserLockoutFields1700000000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_attempts" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip" varchar`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "login_attempts"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "locked_until"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_ip"`);
  }
}
