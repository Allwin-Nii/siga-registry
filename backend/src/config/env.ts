export type DatabaseConfig = {
  host: string
  port: number
  user: string
  password: string
  database: 'siga_registry'
}

export type AppConfig = {
  port: number
  corsOrigin: string
  database: DatabaseConfig
}

type Environment = Record<string, string | undefined>

export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentValidationError'
  }
}

const required = (environment: Environment, name: string) => {
  const value = environment[name]
  if (!value?.trim()) throw new EnvironmentValidationError(`${name} is required.`)
  return value
}

const parsePort = (value: string | undefined, name: string, fallback?: number) => {
  const resolved = value ?? (fallback === undefined ? undefined : String(fallback))
  if (!resolved) throw new EnvironmentValidationError(`${name} is required.`)
  if (!/^\d+$/.test(resolved)) throw new EnvironmentValidationError(`${name} must be a whole number.`)
  const port = Number(resolved)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new EnvironmentValidationError(`${name} must be between 1 and 65535.`)
  }
  return port
}

export const loadEnvironment = (environment: Environment = process.env): AppConfig => {
  const databaseName = required(environment, 'DATABASE_NAME')
  if (databaseName !== 'siga_registry') {
    throw new EnvironmentValidationError('DATABASE_NAME must be siga_registry for this service.')
  }

  return {
    port: parsePort(environment.PORT, 'PORT', 3001),
    corsOrigin: required(environment, 'CORS_ORIGIN'),
    database: {
      host: required(environment, 'DATABASE_HOST'),
      port: parsePort(environment.DATABASE_PORT, 'DATABASE_PORT', 3306),
      user: required(environment, 'DATABASE_USER'),
      password: required(environment, 'DATABASE_PASSWORD'),
      database: 'siga_registry',
    },
  }
}
