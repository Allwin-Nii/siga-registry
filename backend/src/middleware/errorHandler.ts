import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ApiError } from '../lib/errors.js'

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } })
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) return next(error)

  if (error instanceof ApiError) {
    const body: { error: { code: string; message: string; details?: Record<string, string> } } = {
      error: { code: error.code, message: error.message },
    }
    if (error.details) body.error.details = error.details
    response.status(error.statusCode).json(body)
    return
  }

  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
  })
}
