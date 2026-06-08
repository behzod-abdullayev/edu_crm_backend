import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

// ─── FIX: TransformInterceptor ────────────────────────────────────────────────
//
// MUAMMO: Avvalgi versiya har bir response'ni quyidagicha wrap qilardi:
//   { success: true, data: <haqiqiy_data>, timestamp: "...", requestId: "..." }
//
// Bu frontend prompt'i bilan mos kelmadi. Frontend barcha endpointlarda
// to'g'ridan-to'g'ri data keladi deb hisoblaydi:
//   response.data → { page, limit, total, data: [...] }   (pagination)
//   response.data → { id, firstName, ... }                 (single object)
//
// YECHIM: Interceptor data'ni wraplashni to'xtatadi.
// Data aynan backend service qaytargan holda frontendga boradi.
//
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, T> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle();
  }
}
