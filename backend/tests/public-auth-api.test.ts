import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import type { AdministratorApiServices } from '../src/routes/administrator-api.routes.js'
import type { PublicAuthApiServices } from '../src/routes/public-auth.routes.js'
import type { PublicApiServices } from '../src/routes/public-api.routes.js'
import { hashSecret } from '../src/security/credentials.js'

const servers: Server[] = []
const origin = 'http://localhost:5173'
const publicSessionToken = 'public-session-token-for-tests'
const publicCsrfToken = 'public-csrf-token-for-tests'
const administratorSessionToken = 'administrator-session-token-for-tests'

const publicApi = (): PublicApiServices => ({
  authentication: {
    register: vi.fn(),
    login: vi.fn(),
    getAuthenticatedSession: vi.fn(async (token) => token === publicSessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret(publicCsrfToken), expiresAt: new Date('2026-11-02T08:00:00.000Z'), publicUser: { id: 1, email: 'visitor@example.test' },
    }) : undefined),
    logout: vi.fn(),
  },
  categories: { listCategories: async () => [] },
  establishments: {
    getDirectory: async () => ({ data: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }),
    getEntityOptions: async () => ({ data: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }),
    getPublishedBySlug: async () => ({
      id: '1', slug: 'example-entity', name: 'Example Entity', website: '', categoryId: 'soe',
      category: { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }, email: '', contactNumber: '', summary: 'Example entity.',
    }),
  },
})

const publicAuthApi = (): PublicAuthApiServices => ({
  authentication: {
    register: vi.fn(async () => ({ publicUser: { id: 1, email: 'visitor@example.test' }, sessionToken: publicSessionToken, csrfToken: publicCsrfToken, expiresAt: new Date('2026-11-02T08:00:00.000Z') })),
    login: vi.fn(async () => ({ publicUser: { id: 1, email: 'visitor@example.test' }, sessionToken: publicSessionToken, csrfToken: publicCsrfToken, expiresAt: new Date('2026-11-02T08:00:00.000Z') })),
    getAuthenticatedSession: vi.fn(async (token) => token === publicSessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret(publicCsrfToken), expiresAt: new Date('2026-11-02T08:00:00.000Z'), publicUser: { id: 1, email: 'visitor@example.test' },
    }) : undefined),
    logout: vi.fn(async () => undefined),
  },
  allowedOrigin: origin,
  cookieSettings: { secure: true, sessionTtlSeconds: 3600 },
})

const administratorApi = (): AdministratorApiServices => ({
  authentication: {
    login: vi.fn(),
    getAuthenticatedSession: vi.fn(async (token) => token === administratorSessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret('admin-csrf-token'), expiresAt: new Date(), administrator: { id: 1, email: 'admin@example.test' },
    }) : undefined),
    logout: vi.fn(),
  },
  establishments: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setPublication: vi.fn(), delete: vi.fn() },
  categories: { list: vi.fn() },
  allowedOrigin: origin,
  cookieSettings: { secure: true, sessionTtlSeconds: 3600 },
})

const request = async (path: string, publicAuth: PublicAuthApiServices, administrator: AdministratorApiServices, init?: RequestInit) => {
  const server = createApp({ corsOrigin: origin, publicApi: publicApi(), publicAuthApi: publicAuth, administratorApi: administrator }).listen(0)
  servers.push(server)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
  return fetch(`http://127.0.0.1:${address.port}${path}`, init)
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('public authentication API', () => {
  it('registers, restores, and logs out a public session with distinct secure cookies', async () => {
    const auth = publicAuthApi()
    const administrator = administratorApi()
    let activeSession = true
    auth.authentication.getAuthenticatedSession = vi.fn(async (token) => token === publicSessionToken && activeSession ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret(publicCsrfToken), expiresAt: new Date('2026-11-02T08:00:00.000Z'), publicUser: { id: 1, email: 'visitor@example.test' },
    }) : undefined)
    auth.authentication.logout = vi.fn(async () => { activeSession = false })
    const registration = await request('/api/public/auth/register', auth, administrator, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'visitor@example.test', password: 'a test-only public password' }),
    })

    expect(registration.status).toBe(201)
    expect(registration.headers.get('set-cookie')).toContain('siga_public_session=')
    expect(registration.headers.get('set-cookie')).toContain('HttpOnly')
    expect(registration.headers.get('set-cookie')).toContain('Path=/api')
    expect(registration.headers.get('set-cookie')).toContain('SameSite=Strict')
    expect(registration.headers.get('set-cookie')).not.toContain('siga_admin_session=')

    const session = await request('/api/public/auth/session', auth, administrator, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })
    expect(session.status).toBe(200)
    await expect(session.json()).resolves.toMatchObject({ data: { publicUser: { email: 'visitor@example.test' } } })

    const authenticatedHeaders = { headers: { Cookie: `siga_public_session=${publicSessionToken}` } }
    expect((await request('/api/categories', auth, administrator, authenticatedHeaders)).status).toBe(200)
    expect((await request('/api/establishments', auth, administrator, authenticatedHeaders)).status).toBe(200)
    expect((await request('/api/establishments/example-entity', auth, administrator, authenticatedHeaders)).status).toBe(200)

    const logout = await request('/api/public/auth/logout', auth, administrator, {
      method: 'POST', headers: { Origin: origin, 'X-CSRF-Token': publicCsrfToken, Cookie: `siga_public_session=${publicSessionToken}; siga_public_csrf=${publicCsrfToken}` },
    })
    expect(logout.status).toBe(204)
    expect(auth.authentication.logout).toHaveBeenCalledWith(publicSessionToken)
    expect(logout.headers.get('set-cookie')).toContain('siga_public_session=; HttpOnly; Max-Age=0; Path=/api')
    expect((await request('/api/public/auth/session', auth, administrator, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })).status).toBe(401)
  })

  it('protects registry content with public sessions and keeps those sessions isolated from administrator routes', async () => {
    const auth = publicAuthApi()
    const administrator = administratorApi()
    const unauthenticatedDirectory = await request('/api/establishments', auth, administrator)
    const directory = await request('/api/establishments', auth, administrator, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })
    const adminAttempt = await request('/api/admin/establishments', auth, administrator, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })

    expect(unauthenticatedDirectory.status).toBe(401)
    expect(directory.status).toBe(200)
    expect(adminAttempt.status).toBe(401)
    expect(administrator.authentication.getAuthenticatedSession).toHaveBeenCalledWith(undefined)
  })

  it('requires allowed origins and CSRF tokens and rate limits repeated login attempts', async () => {
    const auth = publicAuthApi()
    const administrator = administratorApi()
    const badOrigin = await request('/api/public/auth/login', auth, administrator, {
      method: 'POST', headers: { Origin: 'https://attacker.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'visitor@example.test', password: 'password' }),
    })
    expect(badOrigin.status).toBe(403)

    const badCsrf = await request('/api/public/auth/logout', auth, administrator, {
      method: 'POST', headers: { Origin: origin, 'X-CSRF-Token': 'wrong', Cookie: `siga_public_session=${publicSessionToken}; siga_public_csrf=${publicCsrfToken}` },
    })
    expect(badCsrf.status).toBe(403)

    const server = createApp({ corsOrigin: origin, publicApi: publicApi(), publicAuthApi: auth, administratorApi: administrator }).listen(0)
    servers.push(server)
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
    const login = () => fetch(`http://127.0.0.1:${address.port}/api/public/auth/login`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'rate@example.test', password: 'password' }),
    })
    for (let attempt = 0; attempt < 5; attempt += 1) expect((await login()).status).toBe(200)
    expect((await login()).status).toBe(429)
  })
})
