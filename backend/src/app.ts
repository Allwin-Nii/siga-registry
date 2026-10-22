import cors from 'cors'
import express from 'express'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createAdministratorApiRouter, type AdministratorApiServices } from './routes/administrator-api.routes.js'
import { createPublicApiRouter, type PublicApiServices } from './routes/public-api.routes.js'
import { createHealthRouter, type DatabaseHealthCheck } from './routes/health.routes.js'

export type CreateAppOptions = {
  corsOrigin: string
  checkDatabase?: DatabaseHealthCheck
  publicApi?: PublicApiServices
  administratorApi?: AdministratorApiServices
}

export const createApp = ({ corsOrigin, checkDatabase, publicApi, administratorApi }: CreateAppOptions) => {
  const app = express()

  app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use('/api', createHealthRouter(checkDatabase))
  if (publicApi) app.use('/api', createPublicApiRouter(publicApi))
  if (administratorApi) app.use('/api', createAdministratorApiRouter(administratorApi))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
