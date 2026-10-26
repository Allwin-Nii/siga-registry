import type { FieldPacket } from 'mysql2/promise'
import type { QueryResult } from 'mysql2'
import { describe, expect, it } from 'vitest'
import type { DatabaseExecutor, DatabaseParameter } from '../src/config/database.js'
import { CategoryRepository } from '../src/repositories/category.repository.js'
import { EstablishmentRepository } from '../src/repositories/establishment.repository.js'

type Call = { sql: string; values: DatabaseParameter[] | undefined }

const createExecutor = (responses: unknown[]) => {
  const calls: Call[] = []
  const executor: DatabaseExecutor = {
    async execute<T extends QueryResult>(sql: string, values?: DatabaseParameter[]): Promise<[T, FieldPacket[]]> {
      calls.push({ sql, values })
      return [responses.shift() as T, []]
    },
  }
  return { executor, calls }
}

const row = {
  id: 3,
  slug: 'electricity-company-of-ghana',
  name: 'Electricity Company of Ghana',
  website_url: 'https://ecg.com.gh/',
  logo_url: 'https://ecg.com.gh/logo.png',
  email: 'help@ecggh.com',
  contact_number: '+233 302 611 611',
  summary: 'Electricity distribution utility serving customers across southern Ghana.',
  region: 'Greater Accra',
  city: 'Accra',
  physical_address: '1 ECG Road',
  gps_address: 'GA-123-4567',
  latitude: 5.6037,
  longitude: -0.187,
  workflow_status: 'published' as const,
  created_at: new Date('2026-10-21T00:00:00.000Z'),
  updated_at: new Date('2026-10-21T00:00:00.000Z'),
  submitted_at: new Date('2026-10-20T00:00:00.000Z'),
  reviewed_at: new Date('2026-10-21T00:00:00.000Z'),
  review_feedback: null,
  category_id: 1,
  category_code: 'SOE',
  category_name: 'SOE',
  category_description: 'State-Owned Enterprise',
}

const managementRow = {
  id: 9,
  establishment_id: 3,
  full_name: 'Ama Mensah',
  position: 'Managing Director',
  official_email: 'ama.mensah@ecg.com.gh',
  official_phone: null,
  display_order: 0,
}

describe('MySQL repositories', () => {
  it('retrieves configured categories from SQL rather than route constants', async () => {
    const { executor, calls } = createExecutor([[
      { id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' },
      { id: 2, code: 'JVC', name: 'JVC', description: 'Joint Venture Company' },
      { id: 3, code: 'OSE', name: 'OSE', description: 'Other State Entity' },
    ]])

    const categories = await new CategoryRepository(executor).list()

    expect(categories.map((category) => category.code)).toEqual(['SOE', 'JVC', 'OSE'])
    expect(calls[0]?.sql).toContain('FROM categories')
  })

  it('uses parameterized published-only queries for combined search, category filtering, and pagination', async () => {
    const { executor, calls } = createExecutor([[{ total: 1 }], [row]])
    const repository = new EstablishmentRepository(executor)

    const result = await repository.findPublishedDirectory({
      search: 'Electricity',
      categoryCode: 'SOE',
      page: 2,
      pageSize: 5,
    })

    expect(result).toMatchObject({ page: 2, pageSize: 5, total: 1, totalPages: 1 })
    expect(result.data[0]).toMatchObject({ categoryId: 'soe', name: row.name })
    expect(calls).toHaveLength(2)
    expect(calls[0]?.sql).toContain("e.workflow_status = 'published'")
    expect(calls[0]?.sql).toContain("LOWER(e.name) LIKE LOWER(?) ESCAPE '!'")
    expect(calls[0]?.sql).toContain('c.code = ?')
    expect(calls[0]?.values).toEqual(['%Electricity%', 'SOE'])
    expect(calls[1]?.sql).toContain('ORDER BY e.name ASC, e.id ASC')
    expect(calls[1]?.values).toEqual(['%Electricity%', 'SOE', 5, 5])
  })

  it('supports independent name and category filters before they are combined', async () => {
    const nameExecutor = createExecutor([[{ total: 1 }], [row]])
    await new EstablishmentRepository(nameExecutor.executor).findPublishedDirectory({
      search: 'electricity', page: 1, pageSize: 20,
    })
    expect(nameExecutor.calls[0]?.values).toEqual(['%electricity%'])
    expect(nameExecutor.calls[0]?.sql).not.toContain('c.code = ?')

    const categoryExecutor = createExecutor([[{ total: 1 }], [row]])
    await new EstablishmentRepository(categoryExecutor.executor).findPublishedDirectory({
      categoryCode: 'JVC', page: 1, pageSize: 20,
    })
    expect(categoryExecutor.calls[0]?.values).toEqual(['JVC'])
    expect(categoryExecutor.calls[0]?.sql).toContain('c.code = ?')
  })

  it('treats wildcard and SQL-looking search text as parameter data, never query text', async () => {
    const injection = "' OR 1=1 --_%!"
    const { executor, calls } = createExecutor([[{ total: 0 }], []])
    const repository = new EstablishmentRepository(executor)

    const result = await repository.findPublishedDirectory({ search: injection, page: 1, pageSize: 20 })

    expect(result.data).toEqual([])
    expect(calls[0]?.sql).not.toContain(injection)
    expect(calls[0]?.values).toEqual(["%' OR 1=1 --!_!%!!%"])
    expect(calls[1]?.values).toEqual(["%' OR 1=1 --!_!%!!%", 20, 0])
  })

  it('uses a published-only parameterized lookup for details, so unpublished rows are indistinguishable from missing rows', async () => {
    const { executor, calls } = createExecutor([[row], [managementRow], []])
    const repository = new EstablishmentRepository(executor)

    const published = await repository.findPublishedBySlug(row.slug)
    const absent = await repository.findPublishedBySlug('unpublished-record')

    expect(published).toMatchObject({
      slug: row.slug,
      categoryId: 'soe',
      logoUrl: row.logo_url,
      gpsAddress: row.gps_address,
      management: [{ fullName: managementRow.full_name, position: managementRow.position }],
    })
    expect(absent).toBeUndefined()
    expect(calls[0]?.sql).toContain("e.slug = ? AND e.workflow_status = 'published'")
    expect(calls[0]?.values).toEqual([row.slug])
    expect(calls[1]?.sql).toContain('FROM entity_management')
    expect(calls[1]?.values).toEqual([row.id])
    expect(calls[2]?.sql).toContain("e.slug = ? AND e.workflow_status = 'published'")
    expect(calls[2]?.values).toEqual(['unpublished-record'])
  })
})
