import type { DatabaseTransaction, TransactionRunner } from '../config/database.js'
import { ConflictError, DatabaseUnavailableError, InvalidCredentialsError, ValidationError, isDuplicateKeyError } from '../lib/errors.js'
import type { PublicUserRepositoryPort } from '../repositories/public-user.repository.js'
import { generateSecret, hashPassword, hashSecret, normalizePublicEmail, validatePublicCredentials, verifyPassword } from '../security/credentials.js'
import type { AuthenticatedPublicUserSession, PublicUserIdentity } from '../types/public-user.js'

export type PublicAuthenticationResult = {
  publicUser: PublicUserIdentity
  sessionToken: string
  csrfToken: string
  expiresAt: Date
}

export interface PublicAuthenticationService {
  register(input: { email?: unknown; password?: unknown }): Promise<PublicAuthenticationResult>
  login(input: { email?: unknown; password?: unknown }): Promise<PublicAuthenticationResult>
  getAuthenticatedSession(sessionToken: string | undefined): Promise<AuthenticatedPublicUserSession | undefined>
  logout(sessionToken: string): Promise<void>
}

export class PublicAuthService implements PublicAuthenticationService {
  constructor(
    private readonly publicUsers: PublicUserRepositoryPort,
    private readonly transactions: TransactionRunner,
    private readonly sessionTtlHours: number,
  ) {}

  async register(input: { email?: unknown; password?: unknown }): Promise<PublicAuthenticationResult> {
    const { email, password } = validatePublicCredentials(input.email, input.password)
    try {
      const passwordHash = await hashPassword(password)
      return await this.transactions.runInTransaction(async (transaction) => {
        const publicUser = await this.publicUsers.create(email, passwordHash, transaction)
        return this.createAuthenticatedSession(publicUser, transaction)
      })
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof DatabaseUnavailableError) throw error
      if (isDuplicateKeyError(error)) throw new ConflictError('An account with this email already exists.')
      throw new DatabaseUnavailableError()
    }
  }

  async login(input: { email?: unknown; password?: unknown }): Promise<PublicAuthenticationResult> {
    const email = normalizePublicEmail(input.email)
    const password = typeof input.password === 'string' ? input.password : ''
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 1 || password.length > 128) throw new InvalidCredentialsError()

    try {
      const publicUser = await this.publicUsers.findByEmail(email)
      const candidateHash = publicUser?.passwordHash ?? await hashPassword('invalid-public-user-password')
      if (!publicUser || !await verifyPassword(password, candidateHash)) throw new InvalidCredentialsError()
      return await this.transactions.runInTransaction((transaction) => this.createAuthenticatedSession(publicUser, transaction))
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof DatabaseUnavailableError) throw error
      throw new DatabaseUnavailableError()
    }
  }

  async getAuthenticatedSession(sessionToken: string | undefined): Promise<AuthenticatedPublicUserSession | undefined> {
    if (!sessionToken || sessionToken.length > 128) return undefined
    try {
      return await this.publicUsers.findActiveSession(hashSecret(sessionToken))
    } catch {
      throw new DatabaseUnavailableError()
    }
  }

  async logout(sessionToken: string): Promise<void> {
    try {
      await this.publicUsers.revokeSession(hashSecret(sessionToken))
    } catch {
      throw new DatabaseUnavailableError()
    }
  }

  private async createAuthenticatedSession(publicUser: PublicUserIdentity, transaction: DatabaseTransaction): Promise<PublicAuthenticationResult> {
    const sessionToken = generateSecret()
    const csrfToken = generateSecret()
    const expiresAt = new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000)
    await this.publicUsers.createSession({
      publicUserId: publicUser.id,
      tokenHash: hashSecret(sessionToken),
      csrfTokenHash: hashSecret(csrfToken),
      expiresAt,
    }, transaction)
    await this.publicUsers.markLogin(publicUser.id, transaction)
    return { publicUser: { id: publicUser.id, email: publicUser.email }, sessionToken, csrfToken, expiresAt }
  }
}
