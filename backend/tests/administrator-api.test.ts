import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { DatabaseUnavailableError } from '../src/lib/errors.js'
import type { AdministratorApiServices } from '../src/routes/administrator-api.routes.js'
import { hashSecret } from '../src/security/credentials.js'
import type { PublicApiServices } from '../src/routes/public-api.routes.js'
import type { EstablishmentRecord, PublicEstablishment } from '../src/types/establishment.js'

const servers: Server[] = []
const origin = 'http://localhost:5173'
const sessionToken = 'session-token-for-tests'
const csrfToken = 'csrf-token-for-tests'

const publicEstablishment: PublicEstablishment = {
  id: '1', slug: 'example-entity', name: 'Example Entity', website: 'https://example.test/', categoryId: 'soe',
  category: { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  email: 'info@example.test', contactNumber: '+233 302 000 000', summary: 'An example entity that is visible in the public directory.',
}

const internalEstablishment: EstablishmentRecord = {
  id: 1, slug: publicEstablishment.slug, name: publicEstablishment.name, website: publicEstablishment.website,
  email: publicEstablishment.email, contactNumber: publicEstablishment.contactNumber, summary: publicEstablishment.summary,
  category: { id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }, workflowStatus: 'published',
  createdAt: new Date(), updatedAt: new Date(), submittedAt: null, reviewedAt: null, reviewFeedback: null,
}

const publicApi = (): PublicApiServices => ({
  categories: { listCategories: async () => [publicEstablishment.category] },
  establishments: {
    getDirectory: async () => ({ data: [publicEstablishment], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    getPublishedBySlug: async () => publicEstablishment,
  },
})

const administratorApi = (): AdministratorApiServices => ({
  authentication: {
    login: vi.fn(async () => ({
      administrator: { id: 1, email: 'admin@example.test' }, sessionToken, csrfToken, expiresAt: new Date('2026-10-21T08:00:00.000Z'),
    })),
    getAuthenticatedSession: vi.fn(async (token) => token === sessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret(csrfToken), expiresAt: new Date('2026-10-21T08:00:00.000Z'),
      administrator: { id: 1, email: 'admin@example.test' },
    }) : undefined),
    logout: vi.fn(async () => undefined),
  },
  establishments: {
    list: vi.fn(async () => ({ data: [internalEstablishment], page: 1, pageSize: 20, total: 1, totalPages: 1 })),
    create: vi.fn(async () => internalEstablishment),
    update: vi.fn(async () => internalEstablishment),
    setPublication: vi.fn(async () => internalEstablishment),
    delete: vi.fn(async () => undefined),
  },
  categories: {
    list: vi.fn(async () => [internalEstablishment.category]),
    create: vi.fn(async () => internalEstablishment.category),
    update: vi.fn(async () => internalEstablishment.category),
    delete: vi.fn(async () => undefined),
  },
  allowedOrigin: origin,
  cookieSettings: { secure: true, sessionTtlSeconds: 3600 },
})

const request = async (path: string, admin: AdministratorApiServices, init?: RequestInit) => {
  const server = createApp({ corsOrigin: origin, publicApi: publicApi(), administratorApi: admin }).listen(0)
  servers.push(server)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
  return fetch(`http://127.0.0.1:${address.port}${path}`, init)
}

const mutationHeaders = (csrf = csrfToken) => ({
  Origin: origin,
  'X-CSRF-Token': csrf,
  Cookie: `siga_admin_session=${sessionToken}; siga_admin_csrf=${csrfToken}`,
  'Content-Type': 'application/json',
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('administrator-only API', () => {
  it('keeps category and directory public for anonymous visitors', async () => {
    const admin = administratorApi()
    const categories = await request('/api/categories', admin)
    const directory = await request('/api/establishments', admin)

    expect(categories.status).toBe(200)
    expect(directory.status).toBe(200)
  })

  it('logs an administrator in and out with strict, secure cookies', async () => {
    const admin = administratorApi()
    const login = await request('/api/admin/auth/login', admin, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.test', password: 'test password' }),
    })
    expect(login.status).toBe(200)
    expect(login.headers.get('set-cookie')).toContain('HttpOnly')
    expect(login.headers.get('set-cookie')).toContain('Path=/api')
    expect(login.headers.get('set-cookie')).toContain(`${'siga_admin_csrf'}=${csrfToken}; Max-Age=3600; Path=/`)
    expect(login.headers.get('set-cookie')).toContain('SameSite=Strict')
    expect(login.headers.get('set-cookie')).toContain('Secure')

    const logout = await request('/api/admin/auth/logout', admin, { method: 'POST', headers: mutationHeaders() })
    expect(logout.status).toBe(204)
    expect(admin.authentication.logout).toHaveBeenCalledWith(sessionToken)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(logout.headers.get('set-cookie')).toContain(`${'siga_admin_csrf'}=; Max-Age=0; Path=/`)
  })

  it('denies anonymous, cross-origin, and CSRF-invalid modifications', async () => {
    const admin = administratorApi()
    const anonymous = await request('/api/admin/establishments', admin, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
    })
    expect(anonymous.status).toBe(401)

    const wrongOrigin = await request('/api/admin/establishments', admin, {
      method: 'POST', headers: { ...mutationHeaders(), Origin: 'https://attacker.test' }, body: '{}',
    })
    expect(wrongOrigin.status).toBe(403)

    const wrongCsrf = await request('/api/admin/establishments', admin, {
      method: 'POST', headers: mutationHeaders('wrong-token'), body: '{}',
    })
    expect(wrongCsrf.status).toBe(403)
    expect(admin.establishments.create).not.toHaveBeenCalled()
  })

  it('allows an authenticated administrator to manage establishments and categories', async () => {
    const admin = administratorApi()
    const create = await request('/api/admin/establishments', admin, {
      method: 'POST', headers: mutationHeaders(), body: JSON.stringify({ name: 'Example Entity' }),
    })
    const update = await request('/api/admin/establishments/1', admin, {
      method: 'PATCH', headers: mutationHeaders(), body: JSON.stringify({ name: 'Example Entity' }),
    })
    const publication = await request('/api/admin/establishments/1/publication', admin, {
      method: 'PATCH', headers: mutationHeaders(), body: JSON.stringify({ published: false }),
    })
    const deletion = await request('/api/admin/establishments/1', admin, { method: 'DELETE', headers: mutationHeaders() })
    const categoryCreate = await request('/api/admin/categories', admin, {
      method: 'POST', headers: mutationHeaders(), body: JSON.stringify({ code: 'NEW', name: 'New', description: 'New category' }),
    })

    expect([create.status, update.status, publication.status, deletion.status, categoryCreate.status]).toEqual([201, 200, 200, 204, 201])
    expect(admin.establishments.create).toHaveBeenCalledOnce()
    expect(admin.establishments.setPublication).toHaveBeenCalledWith(1, false)
    expect(admin.establishments.delete).toHaveBeenCalledWith(1)
    expect(admin.categories.create).toHaveBeenCalledOnce()
  })

  it('returns safe database errors from protected administrator routes', async () => {
    const admin = administratorApi()
    admin.establishments.list = vi.fn(async () => { throw new DatabaseUnavailableError() })
    const response = await request('/api/admin/establishments', admin, {
      headers: { Cookie: `siga_admin_session=${sessionToken}` },
    })
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' },
    })
  })
})
