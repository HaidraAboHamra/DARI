import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { ApiErrorBody } from '@dari/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error';

/** Single place where every error becomes a consistent JSON body. */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const { status, body } = this.toResponse(exception);
    body.error.requestId = String(request.id);

    if (status >= 500) {
      this.logger.error({ err: exception, requestId: request.id, url: request.url }, 'Unhandled error');
    }
    void reply.status(status).send(body);
  }

  private toResponse(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        body: { error: { code: exception.code, message: exception.message, details: exception.details } },
      };
    }
    if (exception instanceof ZodError) {
      return {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'البيانات المدخلة غير صالحة',
            details: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, body: { error: { code: httpCode(status), message: exception.message } } };
    }
    return { status: 500, body: { error: { code: 'INTERNAL', message: 'حدث خطأ غير متوقع' } } };
  }
}

function httpCode(status: number): string {
  switch (status) {
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    default:
      return status >= 500 ? 'INTERNAL' : 'BAD_REQUEST';
  }
}
