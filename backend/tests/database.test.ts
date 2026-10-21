import { describe, expect, it } from 'vitest'
import { createDatabasePool } from '../src/config/database.js'

describe('database configuration', () => {
  it('creates a reusable pool without opening a live connection during initialization', async () => {
    const pool = createDatabasePool({
      host: '127.0.0.1',
      port: 3306,
      user: 'siga_registry_app',
      password: 'test-only-password',
      database: 'siga_registry',
    })

    expect(pool).toBeDefined()
    await pool.end()
  })
})
