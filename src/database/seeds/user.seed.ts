import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export async function seedUsers(dataSource: DataSource, tenantId: string): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin1234!', 10);
  const users = [
    { firstName: 'Center',  lastName: 'Owner',   email: 'owner@gmail.com',    role: 'owner'        },
    { firstName: 'Super',   lastName: 'Admin',   email: 'super@gmail.com',    role: 'super_admin'  },
    { firstName: 'Tenant',  lastName: 'Admin',   email: 'admin@gmail.com',    role: 'admin'        },
    { firstName: 'John',    lastName: 'Smith',   email: 'teacher1@gmail.com', role: 'teacher'      },
    { firstName: 'Jane',    lastName: 'Doe',     email: 'teacher2@gmail.com', role: 'teacher'      },
    { firstName: 'Alice',   lastName: 'Student', email: 'student1@gmail.com', role: 'student'      },
    { firstName: 'Bob',     lastName: 'Student', email: 'student2@gmail.com', role: 'student'      },
    { firstName: 'Carol',   lastName: 'Student', email: 'student3@gmail.com', role: 'student'      },
    { firstName: 'Dave',    lastName: 'Student', email: 'student4@gmail.com', role: 'student'      },
    { firstName: 'Eve',     lastName: 'Student', email: 'student5@gmail.com', role: 'student'      },
  ];

  for (const u of users) {
    const existing = await dataSource.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2`,
      [u.email, tenantId],
    ) as { id: string }[];

    let userId = existing[0]?.id;

    if (!userId) {
      // TypeORM synchronize:true created "firstName" and "lastName" columns (camelCase).
      // Use quoted identifiers to match the actual PostgreSQL column names.
      // The `password` column was also created by TypeORM (not `password_hash`).
      const inserted = await dataSource.query(
        `INSERT INTO users (
          tenant_id,
          "firstName",
          "lastName",
          email,
          password,
          role,
          status,
          login_attempts,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', 0, NOW(), NOW())
        RETURNING id`,
        [tenantId, u.firstName, u.lastName, u.email, passwordHash, u.role],
      ) as { id: string }[];
      userId = inserted[0]?.id;
    }

    // OBS-08: a `users` row with role='student' must always have a matching
    // `students` row — every owner-panel aggregation reads from `students`.
    if (u.role === 'student' && userId) {
      const existingStudent = await dataSource.query(
        `SELECT id FROM students WHERE user_id = $1`,
        [userId],
      ) as { id: string }[];

      if (!existingStudent.length) {
        const countRow = await dataSource.query(
          `SELECT COUNT(*) FROM students WHERE tenant_id = $1`,
          [tenantId],
        ) as { count: string }[];
        const studentCode = `STU-${String(parseInt(countRow[0]?.count ?? '0', 10) + 1).padStart(5, '0')}`;

        await dataSource.query(
          `INSERT INTO students (user_id, tenant_id, student_code, enrollment_date, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_DATE, NOW(), NOW())`,
          [userId, tenantId, studentCode],
        );
      }
    }
  }
  console.log('Users seeded successfully');
}