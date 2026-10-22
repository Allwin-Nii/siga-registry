import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicCategories } from './publicApi'

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
      expect.objectContaining({ method: 'GET', credentials: 'omit' }),
    )
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('headers.Authorization')
  })
})
