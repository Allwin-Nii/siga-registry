import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { DatabaseUnavailableError } from '../src/lib/errors.js'
import type { AdministratorApiServices } from '../src/routes/administrator-api.routes.js'
import { hashSecret } from '../src/security/credentials.js'
import { ImageUploadService } from '../src/services/image-upload.service.js'
import type { PublicApiServices } from '../src/routes/public-api.routes.js'
import type { EstablishmentRecord, PublicEstablishment } from '../src/types/establishment.js'

const servers: Server[] = []
const origin = 'http://localhost:5173'
const sessionToken = 'session-token-for-tests'
const csrfToken = 'csrf-token-for-tests'
const publicSessionToken = 'public-session-token-for-tests'

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
  authentication: {
    register: vi.fn(),
    login: vi.fn(),
    getAuthenticatedSession: vi.fn(async (token) => token === publicSessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret('public-csrf-token'), expiresAt: new Date(), publicUser: { id: 1, email: 'visitor@example.test' },
    }) : undefined),
    logout: vi.fn(),
  },
  categories: { listCategories: async () => [publicEstablishment.category] },
  establishments: {
    getDirectory: async () => ({ data: [publicEstablishment], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    getEntityOptions: async () => ({ data: [{ id: publicEstablishment.id, slug: publicEstablishment.slug, name: publicEstablishment.name, categoryCode: publicEstablishment.category.code }], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
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
  analytics: {
    getDashboard: vi.fn(async () => ({
      totals: { establishments: 1, published: 1, drafts: 0, unpublished: 0 },
      categories: [{ code: 'SOE', name: 'SOE', count: 1 }],
      workflowStatuses: [
        { status: 'draft', count: 0 }, { status: 'pending_review', count: 0 }, { status: 'published', count: 1 },
        { status: 'changes_requested', count: 0 }, { status: 'rejected', count: 0 },
      ],
      profileCompleteness: { complete: 0, total: 1, percentage: 0, criteria: ['an institution logo'] },
      regions: [],
      recentActivity: [],
      attention: { missingLogos: 1, missingContactInformation: 0, missingDescriptions: 0, missingRegionalInformation: 0, supportsRegion: true },
    })),
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
const multipartMutationHeaders = (csrf = csrfToken) => ({
  Origin: origin,
  'X-CSRF-Token': csrf,
  Cookie: `siga_admin_session=${sessionToken}; siga_admin_csrf=${csrfToken}`,
})

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

const imageForm = () => {
  const form = new FormData()
  form.append('image', new Blob([png], { type: 'image/png' }), 'logo.png')
  return form
}

const importForm = () => {
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('Entity Name,Category\nExample Entity,SOE')], { type: 'text/csv' }), 'entities.csv')
  return form
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('administrator-only API', () => {
  it('exposes analytics only to an authenticated administrator', async () => {
    const admin = administratorApi()
    const anonymous = await request('/api/admin/analytics', admin)
    const authenticated = await request('/api/admin/analytics', admin, {
      headers: { Cookie: `siga_admin_session=${sessionToken}` },
    })

    expect(anonymous.status).toBe(401)
    expect(authenticated.status).toBe(200)
    await expect(authenticated.json()).resolves.toMatchObject({ data: { totals: { establishments: 1 } } })
    expect(admin.analytics.getDashboard).toHaveBeenCalledOnce()
  })

  it('requires a public session for registry content while keeping administrator authorization separate', async () => {
    const admin = administratorApi()
    const categories = await request('/api/categories', admin)
    const directory = await request('/api/establishments', admin)
    const publicCategories = await request('/api/categories', admin, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })
    const publicDirectory = await request('/api/establishments', admin, { headers: { Cookie: `siga_public_session=${publicSessionToken}` } })

    expect(categories.status).toBe(401)
    expect(directory.status).toBe(401)
    expect(publicCategories.status).toBe(200)
    expect(publicDirectory.status).toBe(200)
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

  it('accepts only authenticated administrator image uploads and passes the exact image payload to storage', async () => {
    const admin = administratorApi()
    const upload = { upload: vi.fn(async () => ({ url: '/uploads/logo-12345678-1234-1234-1234-123456789abc.png', mimeType: 'image/png' as const })) }
    admin.uploads = upload
    const anonymous = await request('/api/admin/uploads/logo', admin, { method: 'POST', headers: { Origin: origin }, body: imageForm() })
    const uploaded = await request('/api/admin/uploads/logo', admin, { method: 'POST', headers: multipartMutationHeaders(), body: imageForm() })
    const invalidKind = await request('/api/admin/uploads/other', admin, { method: 'POST', headers: multipartMutationHeaders(), body: imageForm() })

    expect(anonymous.status).toBe(401)
    expect(uploaded.status).toBe(201)
    expect(await uploaded.json()).toEqual({ data: { url: '/uploads/logo-12345678-1234-1234-1234-123456789abc.png', mimeType: 'image/png' } })
    expect(upload.upload).toHaveBeenCalledWith('logo', expect.any(Buffer), 'image/png')
    expect(invalidKind.status).toBe(400)
  })

  it('stores validated image bytes outside MySQL with a safe generated path', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'siga-registry-upload-'))
    try {
      const uploads = new ImageUploadService(directory)
      const stored = await uploads.upload('logo', png, 'image/png')
      const filename = stored.url.split('/').at(-1)

      expect(stored.url).toMatch(/^\/uploads\/logo-[0-9a-f-]+\.png$/)
      expect(filename).toBeTruthy()
      await expect(readFile(join(directory, filename!))).resolves.toEqual(png)
      await expect(uploads.upload('logo', Buffer.from('not-an-image'), 'image/png')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
      await expect(uploads.upload('logo', png, 'image/jpeg')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
      await expect(uploads.upload('logo', Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('restricts bulk import template, preview, confirmation, and error-report operations to administrators', async () => {
    const admin = administratorApi()
    const imports = {
      createTemplate: vi.fn(async () => Buffer.from('template')),
      preview: vi.fn(async () => ({ id: 'preview-id', expiresAt: '2026-10-21T08:00:00.000Z', total: 1, valid: 1, invalid: 0, duplicates: 0, rows: [] })),
      confirm: vi.fn(async () => ({ imported: [{ rowNumber: 2, id: 2, name: 'Example Entity' }], skippedDuplicates: [], rejected: [] })),
      errorReport: vi.fn(() => Buffer.from('Row,Errors\r\n2,"name: invalid"')),
    }
    admin.imports = imports
    const anonymous = await request('/api/admin/imports/template', admin)
    const template = await request('/api/admin/imports/template', admin, { headers: { Cookie: `siga_admin_session=${sessionToken}` } })
    const preview = await request('/api/admin/imports/preview', admin, { method: 'POST', headers: multipartMutationHeaders(), body: importForm() })
    const confirmation = await request('/api/admin/imports/preview-id/confirm', admin, { method: 'POST', headers: mutationHeaders() })
    const report = await request('/api/admin/imports/preview-id/error-report', admin, { headers: { Cookie: `siga_admin_session=${sessionToken}` } })

    expect(anonymous.status).toBe(401)
    expect(template.status).toBe(200)
    expect(template.headers.get('content-type')).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(preview.status).toBe(200)
    expect(imports.preview).toHaveBeenCalledWith(expect.objectContaining({ filename: 'entities.csv', contentType: 'text/csv', body: expect.any(Buffer) }))
    expect(confirmation.status).toBe(200)
    expect(imports.confirm).toHaveBeenCalledWith('preview-id')
    expect(report.status).toBe(200)
    await expect(report.text()).resolves.toContain('Row,Errors')
  })

  it('allows an authenticated administrator to manage establishments while categories remain read-only', async () => {
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
    const categoryList = await request('/api/admin/categories', admin, { headers: { Cookie: `siga_admin_session=${sessionToken}` } })
    const categoryCreate = await request('/api/admin/categories', admin, { method: 'POST', headers: mutationHeaders(), body: '{}' })
    const categoryUpdate = await request('/api/admin/categories/1', admin, { method: 'PATCH', headers: mutationHeaders(), body: '{}' })
    const categoryDeletion = await request('/api/admin/categories/1', admin, { method: 'DELETE', headers: mutationHeaders() })

    expect([create.status, update.status, publication.status, deletion.status, categoryList.status, categoryCreate.status, categoryUpdate.status, categoryDeletion.status]).toEqual([201, 200, 200, 204, 200, 404, 404, 404])
    expect(admin.establishments.create).toHaveBeenCalledOnce()
    expect(admin.establishments.setPublication).toHaveBeenCalledWith(1, false)
    expect(admin.establishments.delete).toHaveBeenCalledWith(1)
    expect(admin.categories.list).toHaveBeenCalledOnce()
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
