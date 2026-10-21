import { createPool, type FieldPacket, type Pool } from 'mysql2/promise'
import type { QueryResult } from 'mysql2'
import type { DatabaseConfig } from './env.js'

export type DatabaseParameter = string | number | boolean | Date | null

export interface DatabaseExecutor {
  execute<T extends QueryResult>(sql: string, values?: DatabaseParameter[]): Promise<[T, FieldPacket[]]>
}

export interface DatabaseTransaction extends DatabaseExecutor {
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  release(): void
}

export interface TransactionRunner {
  runInTransaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T>
}

export type TransactionPool = DatabaseExecutor & {
  getConnection(): Promise<DatabaseTransaction>
}

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

export const createTransactionRunner = (pool: TransactionPool): TransactionRunner => ({
  async runInTransaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
    const connection = await pool.getConnection()
    let transactionStarted = false

    try {
      await connection.beginTransaction()
      transactionStarted = true
      const result = await work(connection)
      await connection.commit()
      return result
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback()
        } catch {
          // Preserve the original database or application error.
        }
      }
      throw error
    } finally {
      connection.release()
    }
  },
})

export const checkDatabaseConnection = async (pool: Pool) => {
  try {
    await pool.query('SELECT 1')
    return true
  } catch (error) {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : 'UNKNOWN'

    console.error('MySQL connection failed. Error code:', code)
    return false
  }
}
