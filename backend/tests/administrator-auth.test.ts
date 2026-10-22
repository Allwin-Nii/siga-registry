import { describe, expect, it, vi } from 'vitest'
import type { DatabaseTransaction, TransactionRunner } from '../src/config/database.js'
import { ConflictError, InvalidCredentialsError, ValidationError } from '../src/lib/errors.js'
import type { AdministratorRepositoryPort } from '../src/repositories/administrator.repository.js'
import { AdministratorAuthService } from '../src/services/administrator-auth.service.js'
import { createSessionCookies, readCookies } from '../src/security/cookies.js'
import { hashPassword, hashSecret, secretsMatch, verifyPassword } from '../src/security/credentials.js'
import type { Administrator } from '../src/types/administrator.js'

const password = 'a test-only administrator password'
const administrator: Administrator = { id: 1, email: 'admin@example.test', passwordHash: '' }
const transaction = {} as DatabaseTransaction
const transactions: TransactionRunner = { runInTransaction: async (work) => work(transaction) }

const createRepository = (): AdministratorRepositoryPort => ({
  findByEmail: vi.fn(async () => administrator),
  create: vi.fn(async (email, passwordHash) => ({ id: 2, email, passwordHash })),
  createSession: vi.fn(async () => undefined),
  markLogin: vi.fn(async () => undefined),
  findActiveSession: vi.fn(async () => undefined),
  revokeSession: vi.fn(async () => undefined),
})

describe('administrator credentials and sessions', () => {
  it('hashes passwords with scrypt and verifies them without retaining plaintext', async () => {
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/)
    expect(hash).not.toContain(password)
    await expect(verifyPassword(password, hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false)
    expect(secretsMatch('same-value', 'same-value')).toBe(true)
    expect(secretsMatch('same-value', 'different')).toBe(false)
  })

  it('creates the first administrator only through validated, hashed input', async () => {
    const repository = createRepository()
    const service = new AdministratorAuthService(repository, transactions, 8)

    await expect(service.createAdministrator({ email: 'ADMIN@example.test', password }))
      .resolves.toEqual({ id: 2, email: 'admin@example.test' })
    expect(repository.create).toHaveBeenCalledWith('admin@example.test', expect.stringMatching(/^scrypt\$/))
    await expect(service.createAdministrator({ email: 'invalid', password: 'short' })).rejects.toBeInstanceOf(ValidationError)

    repository.create = vi.fn(async () => { throw { code: 'ER_DUP_ENTRY' } })
    await expect(service.createAdministrator({ email: 'admin@example.test', password })).rejects.toBeInstanceOf(ConflictError)
  })

  it('creates a hashed database session for valid login and rejects invalid credentials', async () => {
    administrator.passwordHash = await hashPassword(password)
    const repository = createRepository()
    const service = new AdministratorAuthService(repository, transactions, 8)

    const login = await service.login({ email: administrator.email, password })
    expect(login.administrator).toEqual({ id: 1, email: administrator.email })
    expect(login.sessionToken).not.toContain(administrator.email)
    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining({
      administratorId: 1,
      tokenHash: hashSecret(login.sessionToken),
      csrfTokenHash: hashSecret(login.csrfToken),
    }), transaction)
    expect(repository.markLogin).toHaveBeenCalledWith(1, transaction)

    await expect(service.login({ email: administrator.email, password: 'not the password' }))
      .rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('uses HttpOnly, strict SameSite session cookies and a separate CSRF cookie', () => {
    const cookies = createSessionCookies('session-token', 'csrf-token', { secure: true, sessionTtlSeconds: 3600 })

    expect(cookies[0]).toContain('HttpOnly')
    expect(cookies[0]).toContain('Path=/api')
    expect(cookies[0]).toContain('SameSite=Strict')
    expect(cookies[0]).toContain('Secure')
    expect(cookies[1]).not.toContain('HttpOnly')
    expect(cookies[1]).toContain('Path=/')
    expect(cookies[1]).not.toContain('Path=/api')
    expect(readCookies('siga_admin_session=session-token; siga_admin_csrf=csrf-token').get('siga_admin_csrf')).toBe('csrf-token')
  })
})
