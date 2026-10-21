import { createPool, type Pool } from 'mysql2/promise'
import type { DatabaseConfig } from './env.js'

export const createDatabasePool = (config: DatabaseConfig): Pool => createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
})

export const checkDatabaseConnection = async (pool: Pool) => {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
