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
  security: {
    environment: 'development' | 'test' | 'production'
    sessionTtlHours: number
    secureCookies: boolean
  }
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

const parseBoolean = (value: string | undefined, name: string, fallback: boolean) => {
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new EnvironmentValidationError(`${name} must be true or false.`)
}

const parseEnvironment = (value: string | undefined) => {
  const environment = value ?? 'development'
  if (environment === 'development' || environment === 'test' || environment === 'production') return environment
  throw new EnvironmentValidationError('NODE_ENV must be development, test, or production.')
}

const parseSessionTtlHours = (value: string | undefined) => {
  const hours = parsePort(value, 'SESSION_TTL_HOURS', 8)
  if (hours > 168) throw new EnvironmentValidationError('SESSION_TTL_HOURS must be between 1 and 168.')
  return hours
}

const parseCorsOrigin = (value: string) => {
  try {
    const origin = new URL(value)
    if (origin.origin !== value) throw new Error('Origin must not include a path.')
    return origin.origin
  } catch {
    throw new EnvironmentValidationError('CORS_ORIGIN must be a valid origin without a path.')
  }
}

export const loadEnvironment = (environment: Environment = process.env): AppConfig => {
  const databaseName = required(environment, 'DATABASE_NAME')
  if (databaseName !== 'siga_registry') {
    throw new EnvironmentValidationError('DATABASE_NAME must be siga_registry for this service.')
  }

  const nodeEnvironment = parseEnvironment(environment.NODE_ENV)
  return {
    port: parsePort(environment.PORT, 'PORT', 3001),
    corsOrigin: parseCorsOrigin(required(environment, 'CORS_ORIGIN')),
    database: {
      host: required(environment, 'DATABASE_HOST'),
      port: parsePort(environment.DATABASE_PORT, 'DATABASE_PORT', 3306),
      user: required(environment, 'DATABASE_USER'),
      password: required(environment, 'DATABASE_PASSWORD'),
      database: 'siga_registry',
    },
    security: {
      environment: nodeEnvironment,
      sessionTtlHours: parseSessionTtlHours(environment.SESSION_TTL_HOURS),
      secureCookies: parseBoolean(environment.COOKIE_SECURE, 'COOKIE_SECURE', nodeEnvironment === 'production'),
    },
  }
}
