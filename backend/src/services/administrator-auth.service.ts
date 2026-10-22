import type { TransactionRunner } from '../config/database.js'
import {
  AuthenticationError,
  ConflictError,
  DatabaseUnavailableError,
  InvalidCredentialsError,
  ValidationError,
  isDuplicateKeyError,
} from '../lib/errors.js'
import type { AdministratorRepositoryPort } from '../repositories/administrator.repository.js'
import { generateSecret, hashPassword, hashSecret, normalizeAdministratorEmail, validateAdministratorCredentials, verifyPassword } from '../security/credentials.js'
import type { AdministratorIdentity, AuthenticatedAdministratorSession } from '../types/administrator.js'

export type AdministratorLogin = {
  administrator: AdministratorIdentity
  sessionToken: string
  csrfToken: string
  expiresAt: Date
}

export interface AdministratorAuthenticationService {
  login(input: { email?: unknown; password?: unknown }): Promise<AdministratorLogin>
  getAuthenticatedSession(sessionToken: string | undefined): Promise<AuthenticatedAdministratorSession | undefined>
  logout(sessionToken: string): Promise<void>
}

export class AdministratorAuthService implements AdministratorAuthenticationService {
  constructor(
    private readonly administrators: AdministratorRepositoryPort,
    private readonly transactions: TransactionRunner,
    private readonly sessionTtlHours: number,
  ) {}

  async createAdministrator(input: { email?: unknown; password?: unknown }): Promise<AdministratorIdentity> {
    const { email, password } = validateAdministratorCredentials(input.email, input.password)
    try {
      const passwordHash = await hashPassword(password)
      const administrator = await this.administrators.create(email, passwordHash)
      return { id: administrator.id, email: administrator.email }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof DatabaseUnavailableError) throw error
      if (isDuplicateKeyError(error)) throw new ConflictError('An administrator with this email already exists.')
      throw new DatabaseUnavailableError()
    }
  }

  async login(input: { email?: unknown; password?: unknown }): Promise<AdministratorLogin> {
    const email = normalizeAdministratorEmail(input.email)
    const password = typeof input.password === 'string' ? input.password : ''
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 1 || password.length > 128) {
      throw new InvalidCredentialsError()
    }

    try {
      const administrator = await this.administrators.findByEmail(email)
      const candidateHash = administrator?.passwordHash ?? await hashPassword('invalid-administrator-password')
      if (!administrator || !await verifyPassword(password, candidateHash)) throw new InvalidCredentialsError()

      const sessionToken = generateSecret()
      const csrfToken = generateSecret()
      const expiresAt = new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000)
      await this.transactions.runInTransaction(async (transaction) => {
        await this.administrators.createSession({
          administratorId: administrator.id,
          tokenHash: hashSecret(sessionToken),
          csrfTokenHash: hashSecret(csrfToken),
          expiresAt,
        }, transaction)
        await this.administrators.markLogin(administrator.id, transaction)
      })
      return {
        administrator: { id: administrator.id, email: administrator.email },
        sessionToken,
        csrfToken,
        expiresAt,
      }
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof AuthenticationError || error instanceof DatabaseUnavailableError) throw error
      throw new DatabaseUnavailableError()
    }
  }

  async getAuthenticatedSession(sessionToken: string | undefined): Promise<AuthenticatedAdministratorSession | undefined> {
    if (!sessionToken || sessionToken.length > 128) return undefined
    try {
      return await this.administrators.findActiveSession(hashSecret(sessionToken))
    } catch {
      throw new DatabaseUnavailableError()
    }
  }

  async logout(sessionToken: string): Promise<void> {
    try {
      await this.administrators.revokeSession(hashSecret(sessionToken))
    } catch {
      throw new DatabaseUnavailableError()
    }
  }
}
