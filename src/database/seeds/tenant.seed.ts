import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export async function seedTenants(dataSource: DataSource): Promise<{ id: string; name: string }> {
  const existing = await dataSource.query(
    `SELECT id, name FROM tenants WHERE slug = $1 LIMIT 1`,
    ['demo-school'],
  ) as Array<{ id: string; name: string }>;

  if (existing.length) {
    // Tenant exists — make sure it has a default branch in the JSONB column
    const tenant = existing[0];
    const branchCheck = await dataSource.query(
      `SELECT branches FROM tenants WHERE id = $1`,
      [tenant.id],
    ) as Array<{ branches: unknown }>;

    const currentBranches = branchCheck[0]?.branches;
    const branchArray = Array.isArray(currentBranches) ? currentBranches : [];

    if (branchArray.length === 0) {
      // No branches yet — insert the default "Main Branch"
      const defaultBranch = {
        id: uuidv4(),
        name: 'Main Branch',
        address: 'Tashkent, Uzbekistan',
        phone: null,
        isMain: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await dataSource.query(
        `UPDATE tenants SET branches = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify([defaultBranch]), tenant.id],
      );
      console.log('Default branch added to existing tenant');
    }

    return tenant;
  }

  // Create the tenant with a default "Main Branch" already in the JSONB column
  const defaultBranch = {
    id: uuidv4(),
    name: 'Main Branch',
    address: 'Tashkent, Uzbekistan',
    phone: null,
    isMain: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const result = await dataSource.query(
    `INSERT INTO tenants (name, slug, domain, timezone, default_language, is_active, branches, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, $6::jsonb, NOW(), NOW()) RETURNING id, name`,
    [
      'Demo School',
      'demo-school',
      'demo-school.educrm.com',
      'Asia/Tashkent',
      'uz',
      JSON.stringify([defaultBranch]),
    ],
  ) as Array<{ id: string; name: string }>;

  console.log('Tenant created:', result[0]!.name);
  return result[0]!;
}