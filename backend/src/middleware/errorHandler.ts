import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Not found.' })
}

export const errorHandler: ErrorRequestHandler = (_error, _request, response, next) => {
  if (response.headersSent) return next(_error)
  response.status(500).json({ error: 'An unexpected server error occurred.' })
}
