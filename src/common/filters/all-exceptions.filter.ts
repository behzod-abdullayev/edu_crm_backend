import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { I18nService } from 'nestjs-i18n';

// ─── FIX: AllExceptionsFilter ─────────────────────────────────────────────────
//
// Frontend prompt'i quyidagi EXACT error formatini kutadi:
//
//   {
//     "statusCode": 422,
//     "message": "Validation failed",
//     "code": "VALIDATION_ERROR",
//     "errors": {
//       "email": ["Must be a valid email address"],
//       "password": ["Must be at least 8 characters"]
//     }
//   }
//
// Avvalgi versiya qo'shimcha "success", "path", "timestamp", "requestId"
// maydonlarini qo'shardi. Ular frontendga kerak emas va orval type
// generation'da chalkashlik yaratishi mumkin.
//
// YECHIM: Error response'dan ortiqcha maydonlarni olib tashlab,
// frontendning kutgan EXACT formatiga keltirildi.
//
// ─────────────────────────────────────────────────────────────────────────────

function statusToCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    default:  return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    @Optional() private readonly i18n?: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang =
      (request.query['lang'] as string) ||
      (request.headers['x-custom-lang'] as string) ||
      request.headers['accept-language']?.split(',')[0] ||
      'en';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string | object) || exceptionResponse;
      }

      // ValidationPipe errors: status 400 with array of messages → 422
      if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
        const errors = this.parseValidationMessages(message as string[]);

        this.logger.error(
          `${request.method} ${request.url} - 422`,
          exception instanceof Error ? exception.stack : String(exception),
          'ExceptionFilter',
        );

        // EXACT format frontend kutadi
        response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors,
        });
        return;
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.handleDatabaseError(exception);
    }

    if (this.i18n && status === HttpStatus.NOT_FOUND) {
      try {
        message = (this.i18n.translate('common.errors.not_found', { lang }) as string) || message;
      } catch {
        // fall back to original message
      }
    }

    if (this.i18n && status === HttpStatus.UNAUTHORIZED) {
      try {
        message = (this.i18n.translate('common.errors.unauthorized', { lang }) as string) || message;
      } catch {
        // fall back to original message
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
      'ExceptionFilter',
    );

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    // EXACT format frontend kutadi
    response.status(status).json({
      statusCode: status,
      message: messageStr,
      code: statusToCode(status),
      errors: {},
    });
  }

  private parseValidationMessages(
    messages: string[],
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const msg of messages) {
      // NestJS ValidationPipe format: "propertyName constraint message"
      // e.g. "email must be a valid email address"
      // e.g. "address.city must be a string"
      // e.g. "items.0.price must be a positive number"
      const spaceIndex = msg.indexOf(' ');
      if (spaceIndex === -1) {
        if (!errors['general']) errors['general'] = [];
        errors['general'].push(msg);
        continue;
      }

      const field = msg.substring(0, spaceIndex);
      const text = msg.substring(spaceIndex + 1);

      if (!errors[field]) errors[field] = [];
      errors[field].push(text);
    }

    return errors;
  }

  private handleDatabaseError(error: QueryFailedError): string {
    const driverError = error.driverError as { code?: string };
    switch (driverError?.code) {
      case '23505': return 'Duplicate entry. Record already exists.';
      case '23503': return 'Foreign key constraint violation.';
      case '23502': return 'Required field is missing.';
      case '22P02': return 'Invalid UUID format.';
      default:      return 'Database operation failed.';
    }
  }
}
