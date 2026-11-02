import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { NotFoundError } from '../src/lib/errors.js'
import type { PublicApiServices } from '../src/routes/public-api.routes.js'
import { CategoryService } from '../src/services/category.service.js'
import { PublicEstablishmentService } from '../src/services/public-establishment.service.js'
import { hashSecret } from '../src/security/credentials.js'
import type { DirectoryQuery, PublicEstablishment } from '../src/types/establishment.js'

const servers: Server[] = []
const publicSessionToken = 'public-session-token-for-tests'
const publicCsrfToken = 'public-csrf-token-for-tests'

const published: PublicEstablishment = {
  id: '7',
  slug: 'electricity-company-of-ghana',
  name: 'Electricity Company of Ghana',
  website: 'https://ecg.com.gh/',
  coverImageUrl: 'https://ecg.com.gh/cover.jpg',
  supervisingMinistry: 'Ministry of Energy',
  categoryId: 'soe',
  category: { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  email: 'help@ecggh.com',
  contactNumber: '+233 302 611 611',
  summary: 'Electricity distribution utility serving customers across southern Ghana.',
}

const defaultServices = (): PublicApiServices => ({
  authentication: {
    register: async () => { throw new Error('unused') },
    login: async () => { throw new Error('unused') },
    getAuthenticatedSession: async (token) => token === publicSessionToken ? ({
      id: 1, tokenHash: hashSecret(token), csrfTokenHash: hashSecret(publicCsrfToken), expiresAt: new Date('2026-11-03T00:00:00.000Z'), publicUser: { id: 1, email: 'visitor@example.test' },
    }) : undefined,
    logout: async () => undefined,
  },
  categories: {
    listCategories: async () => [published.category],
  },
  establishments: {
    getDirectory: async () => ({ data: [published], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    getEntityOptions: async () => ({ data: [{ id: published.id, slug: published.slug, name: published.name, categoryCode: published.category.code }], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    getPublishedBySlug: async () => published,
  },
})

const request = async (path: string, publicApi: PublicApiServices, init?: RequestInit, authenticated = true) => {
  const server = createApp({ corsOrigin: 'http://localhost:5173', publicApi }).listen(0)
  servers.push(server)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
  const headers = new Headers(init?.headers)
  if (authenticated) headers.set('Cookie', `siga_public_session=${publicSessionToken}`)
  return fetch(`http://127.0.0.1:${address.port}${path}`, { ...init, headers })
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('public API routes', () => {
  it('requires public authentication before exposing registry content', async () => {
    const services = defaultServices()
    for (const path of ['/api/categories', '/api/establishments', `/api/establishments/${published.slug}`, '/api/establishments/options']) {
      expect((await request(path, services, undefined, false)).status).toBe(401)
    }
  })

  it('returns configured categories using the standard data envelope to public users', async () => {
    const response = await request('/api/categories', defaultServices())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [published.category] })
  })

  it('passes normalized combined directory filters and pagination to the public service', async () => {
    let receivedQuery: DirectoryQuery | undefined
    const services = defaultServices()
    services.establishments.getDirectory = async (query) => {
      receivedQuery = query
      return { data: [published], page: query.page, pageSize: query.pageSize, total: 1, totalPages: 1 }
    }

    const response = await request('/api/establishments?search=Electricity&category=soe&page=2&pageSize=5', services)

    expect(response.status).toBe(200)
    expect(receivedQuery).toEqual({ search: 'Electricity', categoryCode: 'SOE', sort: 'asc', page: 2, pageSize: 5 })
    await expect(response.json()).resolves.toMatchObject({
      data: [expect.objectContaining({
        slug: published.slug,
        coverImageUrl: published.coverImageUrl,
      })],
      meta: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    })
  })

  it('returns small, published-only entity-option pages for the category-aware entity picker', async () => {
    let receivedQuery: { categoryCode?: string; entitySlug?: string; page: number; pageSize: number } | undefined
    const services = defaultServices()
    services.establishments.getEntityOptions = async (query) => {
      receivedQuery = query
      return { data: [{ id: published.id, slug: published.slug, name: published.name, categoryCode: published.category.code }], page: query.page, pageSize: query.pageSize, total: 1, totalPages: 1 }
    }

    const response = await request('/api/establishments/options?category=soe&entity=electricity-company-of-ghana&page=2&pageSize=4', services)

    expect(response.status).toBe(200)
    expect(receivedQuery).toEqual({ categoryCode: 'SOE', entitySlug: published.slug, page: 2, pageSize: 4 })
    await expect(response.json()).resolves.toEqual({
      data: [{ id: published.id, slug: published.slug, name: published.name, categoryCode: 'SOE' }],
      meta: { page: 2, pageSize: 4, total: 1, totalPages: 1 },
    })
  })

  it('returns only public establishment fields from a published detail', async () => {
    const response = await request(`/api/establishments/${published.slug}`, defaultServices())
    const body = await response.json() as { data: Record<string, unknown> }

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({
      name: published.name,
      website: published.website,
      category: published.category,
      coverImageUrl: published.coverImageUrl,
    })
    expect(body.data).not.toHaveProperty('workflowStatus')
    expect(body.data).not.toHaveProperty('reviewFeedback')
    expect(body.data).not.toHaveProperty('submittedAt')
  })

  it('returns the same not-found response for missing and unpublished detail records', async () => {
    const services = defaultServices()
    services.establishments.getPublishedBySlug = async () => {
      throw new NotFoundError('The published establishment was not found.')
    }

    for (const slug of ['missing-establishment', 'unpublished-establishment']) {
      const response = await request(`/api/establishments/${slug}`, services)
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({
        error: { code: 'NOT_FOUND', message: 'The published establishment was not found.' },
      })
    }
  })

  it('rejects invalid directory input and exposes no unsecured write endpoint', async () => {
    const invalidQueryResponse = await request('/api/establishments?page=0', defaultServices())
    expect(invalidQueryResponse.status).toBe(400)
    await expect(invalidQueryResponse.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } })

    const invalidSortResponse = await request('/api/establishments?sort=random-order', defaultServices())
    expect(invalidSortResponse.status).toBe(400)

    const writeResponse = await request('/api/establishments', defaultServices(), { method: 'POST' })
    expect(writeResponse.status).toBe(404)
  })

  it('returns safe 503 responses when category or directory database access fails', async () => {
    const categoryServices = defaultServices()
    categoryServices.categories = new CategoryService({
      list: async () => { throw new Error('Connection details must stay private.') },
      findByCode: async () => undefined,
    })
    const categoryResponse = await request('/api/categories', categoryServices)
    expect(categoryResponse.status).toBe(503)
    await expect(categoryResponse.json()).resolves.toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' },
    })

    const directoryServices = defaultServices()
    directoryServices.establishments = new PublicEstablishmentService({
      findPublishedDirectory: async () => { throw new Error('Connection details must stay private.') },
      findPublishedBySlug: async () => undefined,
    })
    const directoryResponse = await request('/api/establishments', directoryServices)
    expect(directoryResponse.status).toBe(503)
    await expect(directoryResponse.json()).resolves.toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is temporarily unavailable.' },
    })
  })
})
