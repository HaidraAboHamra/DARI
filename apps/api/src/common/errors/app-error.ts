/**
 * Domain/application errors. Services throw these; the HTTP layer maps them to
 * status codes in one place ({@link HttpErrorFilter}). Services never import HTTP types.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_FAILED';
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';
  constructor(message = 'يجب تسجيل الدخول') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'لا تملك صلاحية لهذا الإجراء') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
  constructor(entity: string) {
    super(`${entity} غير موجود`);
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code: string;
  constructor(message: string, code = 'CONFLICT', details?: unknown) {
    super(message, details);
    this.code = code;
  }
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED';
  constructor(retryAfterSeconds: number) {
    super('محاولات كثيرة، حاول لاحقاً', { retryAfterSeconds });
  }
}
