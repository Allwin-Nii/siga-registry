export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Invalid request.', details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'A record with those details already exists.') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class DatabaseUnavailableError extends ApiError {
  constructor() {
    super('The service is temporarily unavailable.', 503, 'DATABASE_UNAVAILABLE')
    this.name = 'DatabaseUnavailableError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication is required.') {
    super(message, 401, 'UNAUTHENTICATED')
    this.name = 'AuthenticationError'
  }
}

export class InvalidCredentialsError extends ApiError {
  constructor() {
    super('Invalid email or password.', 401, 'INVALID_CREDENTIALS')
    this.name = 'InvalidCredentialsError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'This action is not permitted.') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY'

export const isForeignKeyReferenceError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_ROW_IS_REFERENCED_2'
