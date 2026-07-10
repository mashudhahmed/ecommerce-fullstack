export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Record<string, string[]>,
    code?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  isValidationError(): boolean {
    return this.statusCode === 400 && !!this.errors;
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isConflict(): boolean {
    return this.statusCode === 409;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  getDisplayMessage(): string {
    if (this.isValidationError() && this.errors) {
      const messages: string[] = [];
      Object.entries(this.errors).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          messages.push(`${key}: ${value.join(', ')}`);
        } else {
          messages.push(`${key}: ${value}`);
        }
      });
      return messages.join('; ');
    }
    return this.message;
  }
}

export type ErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
};