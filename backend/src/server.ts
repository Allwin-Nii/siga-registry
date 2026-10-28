import 'dotenv/config'
import { createApp } from './app.js'
import { checkDatabaseConnection, createDatabasePool, createTransactionRunner } from './config/database.js'
import { loadEnvironment } from './config/env.js'
import { AdministratorRepository } from './repositories/administrator.repository.js'
import { CategoryRepository } from './repositories/category.repository.js'
import { EstablishmentRepository } from './repositories/establishment.repository.js'
import { CategoryService } from './services/category.service.js'
import { AdministratorAuthService } from './services/administrator-auth.service.js'
import { AdministratorEstablishmentService } from './services/administrator-establishment.service.js'
import { PublicEstablishmentService } from './services/public-establishment.service.js'

const startServer = () => {
  const config = loadEnvironment()
  const pool = createDatabasePool(config.database)
  const categoryRepository = new CategoryRepository(pool)
  const establishmentRepository = new EstablishmentRepository(pool)
  const administratorRepository = new AdministratorRepository(pool)
  const transactions = createTransactionRunner(pool)
  const app = createApp({
    corsOrigin: config.corsOrigin,
    checkDatabase: () => checkDatabaseConnection(pool),
    publicApi: {
      categories: new CategoryService(categoryRepository),
      establishments: new PublicEstablishmentService(establishmentRepository),
    },
    administratorApi: {
      authentication: new AdministratorAuthService(administratorRepository, transactions, config.security.sessionTtlHours),
      establishments: new AdministratorEstablishmentService(establishmentRepository, categoryRepository, transactions),
      categories: categoryRepository,
      allowedOrigin: config.corsOrigin,
      cookieSettings: {
        secure: config.security.secureCookies,
        sessionTtlSeconds: config.security.sessionTtlHours * 60 * 60,
      },
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
