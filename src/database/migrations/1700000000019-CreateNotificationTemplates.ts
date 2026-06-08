import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationTemplates1700000000019 implements MigrationInterface {
  name = 'CreateNotificationTemplates1700000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification_templates',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'tenant_id', type: 'varchar' },
          { name: 'key', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          { name: 'email_subject', type: 'varchar', isNullable: true },
          { name: 'email_body', type: 'text', isNullable: true },
          { name: 'sms_body', type: 'text', isNullable: true },
          { name: 'in_app_title', type: 'varchar', isNullable: true },
          { name: 'in_app_body', type: 'text', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification_templates',
      new TableIndex({
        name: 'IDX_notification_templates_tenant_key',
        columnNames: ['tenant_id', 'key'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notification_templates', 'IDX_notification_templates_tenant_key');
    await queryRunner.dropTable('notification_templates');
  }
}