import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { NotFoundError } from '../src/lib/errors.js'
import type { PublicApiServices } from '../src/routes/public-api.routes.js'
import { CategoryService } from '../src/services/category.service.js'
import { PublicEstablishmentService } from '../src/services/public-establishment.service.js'
import type { DirectoryQuery, PublicEstablishment } from '../src/types/establishment.js'

const servers: Server[] = []

const published: PublicEstablishment = {
  id: '7',
  slug: 'electricity-company-of-ghana',
  name: 'Electricity Company of Ghana',
  website: 'https://ecg.com.gh/',
  categoryId: 'soe',
  category: { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
  email: 'help@ecggh.com',
  contactNumber: '+233 302 611 611',
  summary: 'Electricity distribution utility serving customers across southern Ghana.',
}

const defaultServices = (): PublicApiServices => ({
  categories: {
    listCategories: async () => [published.category],
  },
  establishments: {
    getDirectory: async () => ({ data: [published], page: 1, pageSize: 20, total: 1, totalPages: 1 }),
    getPublishedBySlug: async () => published,
  },
})

const request = async (path: string, publicApi: PublicApiServices, init?: RequestInit) => {
  const server = createApp({ corsOrigin: 'http://localhost:5173', publicApi }).listen(0)
  servers.push(server)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
  return fetch(`http://127.0.0.1:${address.port}${path}`, init)
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('public API routes', () => {
  it('returns configured categories using the standard data envelope', async () => {
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
    expect(receivedQuery).toEqual({ search: 'Electricity', categoryCode: 'SOE', page: 2, pageSize: 5 })
    await expect(response.json()).resolves.toMatchObject({
      data: [expect.objectContaining({ slug: published.slug })],
      meta: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    })
  })

  it('returns only public establishment fields from a published detail', async () => {
    const response = await request(`/api/establishments/${published.slug}`, defaultServices())
    const body = await response.json() as { data: Record<string, unknown> }

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({ name: published.name, website: published.website, category: published.category })
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
