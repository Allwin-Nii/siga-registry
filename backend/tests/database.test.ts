import { describe, expect, it } from 'vitest'
import { createDatabasePool, createTransactionRunner, type DatabaseTransaction } from '../src/config/database.js'

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

  it('commits successful work and rolls back failed multi-step work', async () => {
    const calls: string[] = []
    const connection = {
      beginTransaction: async () => { calls.push('begin') },
      commit: async () => { calls.push('commit') },
      rollback: async () => { calls.push('rollback') },
      release: () => { calls.push('release') },
      execute: async () => [[], []],
    } as unknown as DatabaseTransaction
    const runner = createTransactionRunner({
      execute: connection.execute,
      getConnection: async () => connection,
    })

    await runner.runInTransaction(async () => 'committed')
    expect(calls).toEqual(['begin', 'commit', 'release'])

    calls.length = 0
    await expect(runner.runInTransaction(async () => { throw new Error('fail') })).rejects.toThrow('fail')
    expect(calls).toEqual(['begin', 'rollback', 'release'])
  })
})
