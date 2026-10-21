import { describe, expect, it } from 'vitest'
import { EnvironmentValidationError, loadEnvironment } from '../src/config/env.js'

const validEnvironment = {
  PORT: '3001',
  CORS_ORIGIN: 'http://localhost:5173',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'siga_registry_app',
  DATABASE_PASSWORD: 'test-only-password',
  DATABASE_NAME: 'siga_registry',
}

describe('environment configuration', () => {
  it('loads validated server and database settings', () => {
    const config = loadEnvironment(validEnvironment)

    expect(config).toMatchObject({
      port: 3001,
      corsOrigin: 'http://localhost:5173',
      database: {
        host: '127.0.0.1',
        port: 3306,
        user: 'siga_registry_app',
        database: 'siga_registry',
      },
    })
  })

  it('rejects missing, invalid, or unexpected database settings', () => {
    expect(() => loadEnvironment({ ...validEnvironment, DATABASE_USER: '' })).toThrow(EnvironmentValidationError)
    expect(() => loadEnvironment({ ...validEnvironment, DATABASE_PORT: 'not-a-port' })).toThrow(EnvironmentValidationError)
    expect(() => loadEnvironment({ ...validEnvironment, DATABASE_NAME: 'other_database' })).toThrow(EnvironmentValidationError)
  })
})
