import { createParamDecorator, ExecutionContext } from '@nestjs/common';
 
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // 1. X-Tenant-ID headerdan ol
    if (request.tenantId) return request.tenantId;
    // 2. JWT token dan ol (user already authenticated)
    if (request.user?.tenantId) return request.user.tenantId;
    return '';
  },
);
 