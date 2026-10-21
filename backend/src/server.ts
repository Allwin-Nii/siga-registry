import 'dotenv/config'
import { createApp } from './app.js'
import { checkDatabaseConnection, createDatabasePool } from './config/database.js'
import { loadEnvironment } from './config/env.js'
import { CategoryRepository } from './repositories/category.repository.js'
import { EstablishmentRepository } from './repositories/establishment.repository.js'
import { CategoryService } from './services/category.service.js'
import { PublicEstablishmentService } from './services/public-establishment.service.js'

const startServer = () => {
  const config = loadEnvironment()
  const pool = createDatabasePool(config.database)
  const categoryRepository = new CategoryRepository(pool)
  const establishmentRepository = new EstablishmentRepository(pool)
  const app = createApp({
    corsOrigin: config.corsOrigin,
    checkDatabase: () => checkDatabaseConnection(pool),
    publicApi: {
      categories: new CategoryService(categoryRepository),
      establishments: new PublicEstablishmentService(establishmentRepository),
    },
  })
  const server = app.listen(config.port, () => {
    console.info(`SIGA Registry API listening on port ${config.port}.`)
  })

  const shutdown = () => {
    server.close(() => {
      void pool.end()
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

try {
  startServer()
} catch {
  console.error('SIGA Registry API could not start because environment configuration is missing or invalid.')
  process.exitCode = 1
}
