import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Tenant, TenantFeatureFlags } from './entities/tenant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantPublicConfigDto } from './dto/tenant-public-config.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectRepository(Tenant) private repo: Repository<Tenant>) {}

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.repo.create(data);
    return this.repo.save(tenant);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, data);
    await this.repo.save(tenant);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.repo.softRemove(tenant);
  }

  /** Toggle a feature flag by key */
  async updateFeatureFlag(id: string, flag: keyof TenantFeatureFlags, value: boolean): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.featureFlags = { ...(tenant.featureFlags ?? {} as TenantFeatureFlags), [flag]: value };
    await this.repo.save(tenant);
    return this.findOne(id);
  }

  /** Merge new settings into existing settings object */
  async updateSettings(id: string, settings: Record<string, unknown>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.settings = { ...(tenant.settings ?? {}), ...settings };
    await this.repo.save(tenant);
    return this.findOne(id);
  }

  /** Add a branch name to the tenant's branches array */
  async addBranch(id: string, branch: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    const current = tenant.branches ?? [];
    if (!current.includes(branch)) {
      tenant.branches = [...current, branch];
      await this.repo.save(tenant);
    }
    return this.findOne(id);
  }

  /** Return public branding and feature config for a tenant by slug (no auth required) */
  async getPublicConfig(slug: string): Promise<TenantPublicConfigDto> {
    const tenant = await this.repo.findOne({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }
    return this.toPublicConfigDto(tenant);
  }

  /** Return public branding and feature config for the caller's own tenant (auth required) */
  async getPublicConfigByTenantId(tenantId: string): Promise<TenantPublicConfigDto> {
    const tenant = await this.findOne(tenantId);
    return this.toPublicConfigDto(tenant);
  }

  private toPublicConfigDto(tenant: Tenant): TenantPublicConfigDto {
    const flags: Partial<TenantFeatureFlags> = tenant.featureFlags ?? {};

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
      featureFlags: {
        paymentsEnabled:      flags.paymentsEnabled      ?? true,
        chatEnabled:          flags.chatEnabled          ?? true,
        certificatesEnabled:  flags.certificatesEnabled  ?? true,
        examEngineEnabled:    flags.examEngineEnabled    ?? true,
        analyticsEnabled:     flags.analyticsEnabled     ?? true,
        multiCurrencyEnabled: flags.multiCurrencyEnabled ?? false,
      },
      defaultLocale: tenant.defaultLanguage ?? 'uz',
      timezone: tenant.timezone ?? 'Asia/Tashkent',
      currency: (tenant.settings?.['currency'] as string | undefined) ?? 'UZS',
    };
  }
}
