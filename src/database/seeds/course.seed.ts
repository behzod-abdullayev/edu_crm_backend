import { DataSource } from 'typeorm';

export async function seedCourses(dataSource: DataSource, tenantId: string, teacherId: string): Promise<void> {
  const courses = [
    { title: 'English for Beginners', price: 500000, status: 'published' },
    { title: 'Mathematics Advanced', price: 600000, status: 'published' },
    { title: 'Web Development', price: 800000, status: 'draft' },
  ];
  for (const c of courses) {
    const existing = await dataSource.query(
      `SELECT id FROM courses WHERE title = $1 AND tenant_id = $2`, [c.title, tenantId],
    );
    if (!existing.length) {
      await dataSource.query(
        `INSERT INTO courses (tenant_id, title, price, currency, status, teacher_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'UZS', $4, $5, NOW(), NOW())`,
        [tenantId, c.title, c.price, c.status, teacherId],
      );
    }
  }
  console.log('Courses seeded');
}