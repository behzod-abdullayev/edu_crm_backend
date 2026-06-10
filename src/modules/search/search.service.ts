import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../../shared/enums';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SearchResultDto } from './dto/search-response.dto';

type SearchGroup = 'students' | 'teachers' | 'courses';

// Which entity groups each role is allowed to search, restricted to groups
// that role has a real, reachable detail/list page for (per middleware
// route-prefix rules in src/middleware.ts).
const ROLE_GROUPS: Record<UserRole, SearchGroup[]> = {
  [UserRole.SUPER_ADMIN]: ['students', 'teachers', 'courses'],
  [UserRole.OWNER]: ['students', 'teachers', 'courses'],
  [UserRole.ADMIN]: ['students', 'teachers', 'courses'],
  [UserRole.TEACHER]: ['students'],
  [UserRole.STUDENT]: ['courses'],
};

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentCode: string | null;
}

interface TeacherRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string | null;
}

interface CourseRow {
  id: string;
  title: string;
  status: string;
}

@Injectable()
export class SearchService {
  constructor(private dataSource: DataSource) {}

  async search(
    tenantId: string,
    role: UserRole,
    query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const start = Date.now();
    const term = query.q.trim();
    if (!term) {
      return { results: [], total: 0, took: Date.now() - start };
    }

    const limit = query.limit ?? 10;
    const like = `%${term}%`;
    const allowed = ROLE_GROUPS[role] ?? [];
    const requested = query.types
      ?.split(',')
      .map((t) => t.trim())
      .filter((t): t is SearchGroup => allowed.includes(t as SearchGroup));
    const groups = requested && requested.length > 0 ? requested : allowed;

    const results: SearchResultDto[] = [];

    if (groups.includes('students')) {
      results.push(...(await this.searchStudents(tenantId, like, limit, role)));
    }
    if (groups.includes('teachers')) {
      results.push(...(await this.searchTeachers(tenantId, like, limit)));
    }
    if (groups.includes('courses')) {
      results.push(...(await this.searchCourses(tenantId, like, limit, role)));
    }

    return { results: results.slice(0, limit), total: results.length, took: Date.now() - start };
  }

  private async searchStudents(
    tenantId: string,
    like: string,
    limit: number,
    role: UserRole,
  ): Promise<SearchResultDto[]> {
    const rows = (await this.dataSource.query(
      `SELECT s.id AS id, u."firstName" AS "firstName", u."lastName" AS "lastName",
              u.email AS email, s.student_code AS "studentCode"
       FROM users u
       INNER JOIN students s ON s.user_id = u.id
       WHERE u.tenant_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
         AND (u."firstName" ILIKE $2 OR u."lastName" ILIKE $2 OR u.email ILIKE $2 OR s.student_code ILIKE $2)
       ORDER BY u."firstName" ASC, u."lastName" ASC
       LIMIT $3`,
      [tenantId, like, limit],
    )) as StudentRow[];

    const href = role === UserRole.TEACHER ? '/teacher/students' : '/admin/students';
    return rows.map((r) => ({
      id: r.id,
      label: `${r.firstName} ${r.lastName}`.trim(),
      group: 'students',
      href: role === UserRole.TEACHER ? `${href}/${r.id}` : href,
      meta: r.studentCode ?? r.email,
    }));
  }

  private async searchTeachers(
    tenantId: string,
    like: string,
    limit: number,
  ): Promise<SearchResultDto[]> {
    const rows = (await this.dataSource.query(
      `SELECT u.id AS id, u."firstName" AS "firstName", u."lastName" AS "lastName",
              u.email AS email, t.specialization AS specialization
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.tenant_id = $1 AND u.role = 'teacher' AND u.deleted_at IS NULL
         AND (u."firstName" ILIKE $2 OR u."lastName" ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u."firstName" ASC, u."lastName" ASC
       LIMIT $3`,
      [tenantId, like, limit],
    )) as TeacherRow[];

    return rows.map((r) => ({
      id: r.id,
      label: `${r.firstName} ${r.lastName}`.trim(),
      group: 'teachers',
      href: '/admin/teachers',
      meta: r.specialization ?? r.email,
    }));
  }

  private async searchCourses(
    tenantId: string,
    like: string,
    limit: number,
    role: UserRole,
  ): Promise<SearchResultDto[]> {
    const rows = (await this.dataSource.query(
      `SELECT id, title, status
       FROM courses
       WHERE tenant_id = $1 AND deleted_at IS NULL AND title ILIKE $2
       ORDER BY title ASC
       LIMIT $3`,
      [tenantId, like, limit],
    )) as CourseRow[];

    const prefix = role === UserRole.STUDENT ? '/student/courses' : '/admin/courses';
    return rows.map((r) => ({
      id: r.id,
      label: r.title,
      group: 'courses',
      href: `${prefix}/${r.id}`,
      meta: r.status,
    }));
  }
}
