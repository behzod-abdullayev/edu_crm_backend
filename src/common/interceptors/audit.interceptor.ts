import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '../../shared/enums';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: { id: string; tenantId: string };
      headers: Record<string, string>;
      ip: string;
    }>();

    const { method, url, user, ip } = request;

    // Only log write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) || !user) {
      return next.handle();
    }

    const action = this.methodToAction(method);
    const entityType = this.urlToEntityType(url);
    const tenantId = user.tenantId || request.headers['x-tenant-id'] || '';

    return next.handle().pipe(
      tap(() => {
        this.eventEmitter.emit('audit.log', {
          userId: user.id,
          tenantId,
          action,
          entityType,
          ipAddress: ip,
          userAgent: request.headers['user-agent'],
          requestId: request.headers['x-request-id'],
        });
      }),
    );
  }

  private methodToAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':   return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':  return AuditAction.UPDATE;
      case 'DELETE': return AuditAction.DELETE;
      default:       return AuditAction.UPDATE;
    }
  }

  private urlToEntityType(url: string): string {
    // Extract entity type from URL path, e.g. /api/v1/students/uuid → students
    const parts = url.split('/').filter(Boolean);
    // Find the segment after the version prefix (v1, v2, etc.)
    const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
    if (versionIdx !== -1 && parts[versionIdx + 1]) {
      return parts[versionIdx + 1];
    }
    return parts[parts.length - 1] || 'unknown';
  }
}
