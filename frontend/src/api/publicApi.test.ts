import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicCategories, getPublicDirectory, getPublicEntityOptions } from './publicApi'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('public API client', () => {
  it('retrieves typed category data anonymously', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(getPublicCategories()).resolves.toEqual([
      { id: 'soe', code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/categories',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('headers.Authorization')
  })

  it('sends validated directory sort and entity options as compact anonymous requests', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [], meta: { page: 1, pageSize: 4, total: 0, totalPages: 0 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: '1', slug: 'example-entity', name: 'Example Entity', categoryCode: 'SOE' }],
        meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await getPublicDirectory({ category: 'SOE', entity: 'example-entity', sort: 'desc', page: 1, pageSize: 4 })
    await expect(getPublicEntityOptions({ category: 'SOE', page: 1, pageSize: 25 })).resolves.toMatchObject({
      data: [{ name: 'Example Entity', categoryCode: 'SOE' }],
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1,
      'http://localhost:3001/api/establishments?category=SOE&entity=example-entity&sort=desc&page=1&pageSize=4',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'http://localhost:3001/api/establishments/options?category=SOE&page=1&pageSize=25',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })
})
