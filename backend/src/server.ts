import 'dotenv/config'
import { createApp } from './app.js'
import { checkDatabaseConnection, createDatabasePool } from './config/database.js'
import { loadEnvironment } from './config/env.js'

const startServer = () => {
  const config = loadEnvironment()
  const pool = createDatabasePool(config.database)
  const app = createApp({
    corsOrigin: config.corsOrigin,
    checkDatabase: () => checkDatabaseConnection(pool),
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
