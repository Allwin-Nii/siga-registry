import cors from 'cors'
import express from 'express'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createHealthRouter, type DatabaseHealthCheck } from './routes/health.routes.js'

export type CreateAppOptions = {
  corsOrigin: string
  checkDatabase?: DatabaseHealthCheck
}

export const createApp = ({ corsOrigin, checkDatabase }: CreateAppOptions) => {
  const app = express()

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json({ limit: '1mb' }))
  app.use('/api', createHealthRouter(checkDatabase))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
