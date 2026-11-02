import { describe, expect, it, vi } from 'vitest'
import type { DatabaseTransaction, TransactionRunner } from '../src/config/database.js'
import { ConflictError, InvalidCredentialsError, ValidationError } from '../src/lib/errors.js'
import type { PublicUserRepositoryPort } from '../src/repositories/public-user.repository.js'
import { PublicAuthService } from '../src/services/public-auth.service.js'
import { hashPassword, hashSecret } from '../src/security/credentials.js'
import type { PublicUser } from '../src/types/public-user.js'

const password = 'a test-only public password'
const user: PublicUser = { id: 1, email: 'visitor@example.test', passwordHash: '' }
const transaction = {} as DatabaseTransaction
const transactions: TransactionRunner = { runInTransaction: async (work) => work(transaction) }

const createRepository = (): PublicUserRepositoryPort => ({
  findByEmail: vi.fn(async () => user),
  create: vi.fn(async (email, passwordHash) => ({ id: 2, email, passwordHash })),
  createSession: vi.fn(async () => undefined),
  markLogin: vi.fn(async () => undefined),
  findActiveSession: vi.fn(async () => undefined),
  revokeSession: vi.fn(async () => undefined),
})

describe('public user authentication', () => {
  it('registers a validated account with a hashed password and an authenticated session', async () => {
    const repository = createRepository()
    const service = new PublicAuthService(repository, transactions, 8)

    const registration = await service.register({ email: 'VISITOR@example.test', password })

    expect(registration.publicUser).toEqual({ id: 2, email: 'visitor@example.test' })
    expect(repository.create).toHaveBeenCalledWith('visitor@example.test', expect.stringMatching(/^scrypt\$/), transaction)
    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining({
      publicUserId: 2,
      tokenHash: hashSecret(registration.sessionToken),
      csrfTokenHash: hashSecret(registration.csrfToken),
    }), transaction)
    await expect(service.register({ email: 'invalid', password: 'short' })).rejects.toBeInstanceOf(ValidationError)

    repository.create = vi.fn(async () => { throw { code: 'ER_DUP_ENTRY' } })
    await expect(service.register({ email: user.email, password })).rejects.toBeInstanceOf(ConflictError)
  })

  it('logs public users in and out without sharing administrator credentials or sessions', async () => {
    user.passwordHash = await hashPassword(password)
    const repository = createRepository()
    const service = new PublicAuthService(repository, transactions, 8)

    const login = await service.login({ email: user.email, password })

    expect(login.publicUser).toEqual({ id: user.id, email: user.email })
    expect(login.sessionToken).not.toContain(user.email)
    expect(repository.markLogin).toHaveBeenCalledWith(user.id, transaction)
    await service.logout(login.sessionToken)
    expect(repository.revokeSession).toHaveBeenCalledWith(hashSecret(login.sessionToken))
    await expect(service.login({ email: user.email, password: 'wrong password' })).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
