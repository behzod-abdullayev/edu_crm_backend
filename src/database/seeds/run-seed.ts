import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { seedTenants } from './tenant.seed';
import { seedUsers } from './user.seed';
import { seedCourses } from './course.seed';

async function runSeed(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'edu_crm',
    entities: [__dirname + '/../../**/*.entity.{ts,js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected. Running seeds...');

    const tenant = await seedTenants(dataSource);
    console.log('Tenant:', tenant.name, tenant.id);

    await seedUsers(dataSource, tenant.id);

    const teachers = await dataSource.query(
      `SELECT u.id FROM users u WHERE u.tenant_id = $1 AND u.role = 'teacher' LIMIT 1`,
      [tenant.id],
    ) as Array<{ id: string }>;

    if (teachers.length) {
      const teacherUser = teachers[0];
      const existing = await dataSource.query(`SELECT id FROM teachers WHERE user_id = $1`, [teacherUser.id]) as Array<{ id: string }>;
      let teacherId = existing[0]?.id;
      if (!teacherId) {
        const res = await dataSource.query(
          `INSERT INTO teachers (user_id, tenant_id, teacher_code, created_at, updated_at)
           VALUES ($1, $2, 'TCH-0001', NOW(), NOW()) RETURNING id`,
          [teacherUser.id, tenant.id],
        ) as Array<{ id: string }>;
        teacherId = res[0].id;
      }
      await seedCourses(dataSource, tenant.id, teacherId);
    }

    // Seed default notification templates
    console.log('Seeding notification templates...');
    const templates = [
      {
        key: 'payment.created',
        name: 'Payment Created',
        email_subject: 'New payment invoice - {{invoiceNumber}}',
        email_body: 'Dear {{studentName}}, a new payment invoice #{{invoiceNumber}} for {{amount}} {{currency}} has been created.',
        in_app_title: 'New payment',
        in_app_body: 'Invoice #{{invoiceNumber}} for {{amount}} {{currency}} created.',
      },
      {
        key: 'homework.assigned',
        name: 'Homework Assigned',
        email_subject: 'New homework: {{title}}',
        email_body: 'Dear {{studentName}}, you have a new homework assignment: {{title}}. Due date: {{dueDate}}.',
        in_app_title: 'New homework',
        in_app_body: 'New homework "{{title}}" assigned. Due: {{dueDate}}',
      },
      {
        key: 'exam.published',
        name: 'Exam Published',
        email_subject: 'Exam scheduled: {{examTitle}}',
        email_body: 'Dear {{studentName}}, a new exam "{{examTitle}}" has been scheduled for {{examDate}}.',
        in_app_title: 'New exam',
        in_app_body: 'Exam "{{examTitle}}" scheduled for {{examDate}}',
      },
    ];

    for (const tpl of templates) {
      await dataSource.query(
        `INSERT INTO notification_templates (tenant_id, key, name, email_subject, email_body, in_app_title, in_app_body, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [tenant.id, tpl.key, tpl.name, tpl.email_subject, tpl.email_body, tpl.in_app_title, tpl.in_app_body],
      );
    }
    console.log(`Seeded ${templates.length} notification templates`);

    // Seed example discount code
    console.log('Seeding discount codes...');
    await dataSource.query(
      `INSERT INTO discounts (tenant_id, name, code, type, value, valid_from, is_active, used_count, created_at, updated_at)
       VALUES ($1, 'Welcome Discount', 'WELCOME10', 'percentage', 10, NOW(), true, 0, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [tenant.id],
    );
    console.log('Seeded WELCOME10 discount code (10% off)');

    console.log('\n✅ Seed complete!');
    console.log('Login credentials (password: Admin1234!):');
    console.log('  owner@gmail.com | admin@gmail.com | teacher1@gmail.com | student1@gmail.com');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();