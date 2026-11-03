import type { FieldPacket } from 'mysql2/promise'
import type { QueryResult } from 'mysql2'
import { describe, expect, it } from 'vitest'
import type { DatabaseExecutor, DatabaseParameter } from '../src/config/database.js'
import { CategoryRepository } from '../src/repositories/category.repository.js'
import { EstablishmentRepository } from '../src/repositories/establishment.repository.js'
import { AdministratorAnalyticsRepository } from '../src/repositories/administrator-analytics.repository.js'

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
  cover_image_url: 'https://ecg.com.gh/cover.jpg',
  supervising_ministry: 'Ministry of Energy',
  email: 'help@ecggh.com',
  contact_number: '+233 302 611 611',
  summary: 'Electricity distribution utility serving customers across southern Ghana.',
  region: 'Greater Accra',
  city: 'Accra',
  physical_address: '1 ECG Road',
  gps_address: 'GA-123-4567',
  gps_location_url: 'https://www.google.com/maps/place/ECG',
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
  it('aggregates categories, workflow statuses, profile completeness, and empty results for administrator analytics', async () => {
    const populated = createExecutor([
      [{ establishments: 4, published: 1, drafts: 1, pending_review: 1, complete_profiles: 2, missing_logos: 2, missing_contact_information: 1, missing_descriptions: 0, missing_regional_information: 3 }],
      [{ code: 'SOE', name: 'SOE', count: 2 }, { code: 'JVC', name: 'JVC', count: 1 }, { code: 'OSE', name: 'OSE', count: 1 }],
      [{ workflow_status: 'published', count: 1 }, { workflow_status: 'pending_review', count: 1 }, { workflow_status: 'rejected', count: 1 }, { workflow_status: 'draft', count: 1 }],
      [{ region: 'Greater Accra', count: 3 }],
      [{ id: 3, name: 'Example Entity', category_code: 'SOE', category_name: 'SOE', workflow_status: 'published', updated_at: row.updated_at }],
    ])

    const dashboard = await new AdministratorAnalyticsRepository(populated.executor).getDashboard()

    expect(dashboard.totals).toEqual({ establishments: 4, published: 1, drafts: 1, pendingReview: 1 })
    expect(dashboard.categories).toEqual([{ code: 'SOE', name: 'SOE', count: 2 }, { code: 'JVC', name: 'JVC', count: 1 }, { code: 'OSE', name: 'OSE', count: 1 }])
    expect(dashboard.workflowStatuses).toEqual([
      { status: 'draft', count: 1 }, { status: 'pending_review', count: 1 }, { status: 'published', count: 1 },
      { status: 'changes_requested', count: 0 }, { status: 'rejected', count: 1 },
    ])
    expect(dashboard.profileCompleteness).toMatchObject({ complete: 2, total: 4, percentage: 50 })
    expect(dashboard.attention).toMatchObject({ missingLogos: 2, missingContactInformation: 1, missingDescriptions: 0, missingRegionalInformation: 3 })
    expect(dashboard.recentActivity[0]).toMatchObject({ name: 'Example Entity', categoryCode: 'SOE', workflowStatus: 'published' })
    expect(populated.calls).toHaveLength(5)
    expect(populated.calls[0]?.sql).toContain('complete_profiles')
    expect(populated.calls[1]?.sql).toContain('LEFT JOIN establishments')
    expect(populated.calls[2]?.sql).toContain('GROUP BY e.workflow_status')

    const empty = createExecutor([
      [{ establishments: 0, published: 0, drafts: 0, pending_review: 0, complete_profiles: 0, missing_logos: 0, missing_contact_information: 0, missing_descriptions: 0, missing_regional_information: 0 }],
      [{ code: 'SOE', name: 'SOE', count: 0 }], [], [], [],
    ])
    const emptyDashboard = await new AdministratorAnalyticsRepository(empty.executor).getDashboard()
    expect(emptyDashboard.totals).toEqual({ establishments: 0, published: 0, drafts: 0, pendingReview: 0 })
    expect(emptyDashboard.profileCompleteness).toMatchObject({ complete: 0, total: 0, percentage: 0 })
    expect(emptyDashboard.regions).toEqual([])
    expect(emptyDashboard.recentActivity).toEqual([])
  })

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
      sort: 'desc',
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
    expect(calls[1]?.sql).toContain('ORDER BY e.name DESC, e.id ASC')
    expect(calls[1]?.values).toEqual(['%Electricity%', 'SOE', 5, 5])
  })

  it('uses small, parameterized published-only option pages for entity selection', async () => {
    const { executor, calls } = createExecutor([[{ total: 1 }], [{ id: row.id, slug: row.slug, name: row.name, category_code: row.category_code }]])
    const result = await new EstablishmentRepository(executor).findPublishedEntityOptions({
      categoryCode: 'SOE', entitySlug: row.slug, page: 2, pageSize: 4,
    })

    expect(result).toEqual({
      data: [{ id: String(row.id), slug: row.slug, name: row.name, categoryCode: row.category_code }],
      page: 2, pageSize: 4, total: 1, totalPages: 1,
    })
    expect(calls[0]?.sql).toContain("e.workflow_status = 'published'")
    expect(calls[0]?.sql).toContain('c.code = ?')
    expect(calls[0]?.sql).toContain('e.slug = ?')
    expect(calls[0]?.values).toEqual(['SOE', row.slug])
    expect(calls[1]?.sql).toContain('ORDER BY e.name ASC, e.id ASC')
    expect(calls[1]?.values).toEqual(['SOE', row.slug, 4, 4])
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
      coverImageUrl: row.cover_image_url,
      supervisingMinistry: row.supervising_ministry,
      gpsAddress: row.gps_address,
      gpsLocationUrl: row.gps_location_url,
      latitude: row.latitude,
      longitude: row.longitude,
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

  it('returns an existing profile when its management query has no rows', async () => {
    const { executor, calls } = createExecutor([[row], []])

    const profile = await new EstablishmentRepository(executor).findPublishedBySlug(row.slug)

    expect(profile).toMatchObject({ slug: row.slug, management: [] })
    expect(calls[1]?.sql).toContain('FROM entity_management')
    expect(calls[1]?.values).toEqual([row.id])
  })
})
