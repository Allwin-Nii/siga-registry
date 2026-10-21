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

export class InvalidWorkflowTransitionError extends ApiError {
  constructor(message = 'This workflow transition is not allowed.') {
    super(message, 409, 'INVALID_WORKFLOW_TRANSITION')
    this.name = 'InvalidWorkflowTransitionError'
  }
}

export class DatabaseUnavailableError extends ApiError {
  constructor() {
    super('The service is temporarily unavailable.', 503, 'DATABASE_UNAVAILABLE')
    this.name = 'DatabaseUnavailableError'
  }
}

export const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY'
