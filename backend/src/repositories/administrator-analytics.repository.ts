import type { RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type {
  AdministratorAnalytics,
  AnalyticsCategory,
  AnalyticsRecentActivity,
  AnalyticsRegion,
  AnalyticsWorkflowStatus,
} from '../types/administrator-analytics.js'
import { workflowStatusCodes, type WorkflowStatusCode } from '../types/workflow.js'

type SummaryRow = RowDataPacket & {
  establishments: number
  published: number
  drafts: number
  unpublished: number
  complete_profiles: number
  missing_logos: number
  missing_contact_information: number
  missing_descriptions: number
  missing_regional_information: number
}

type CategoryRow = RowDataPacket & {
  code: string
  name: string
  count: number
}

type WorkflowRow = RowDataPacket & {
  workflow_status: WorkflowStatusCode
  count: number
}

type RegionRow = RowDataPacket & {
  region: string
  count: number
}

type RecentActivityRow = RowDataPacket & {
  id: number
  name: string
  category_code: string
  category_name: string
  workflow_status: WorkflowStatusCode
  updated_at: Date
}

export interface AdministratorAnalyticsReader {
  getDashboard(): Promise<AdministratorAnalytics>
}

const numberFrom = (value: unknown) => Number(value ?? 0)

const profileCriteria = [
  'an institution logo',
  'at least one contact method (email or telephone)',
  'a description',
  'a region',
]

/**
 * Read-only aggregate queries for the administrator dashboard. The existing
 * profile migration supplies all fields used below; values that are blank are
 * treated the same as NULL values.
 */
export class AdministratorAnalyticsRepository implements AdministratorAnalyticsReader {
  constructor(private readonly database: DatabaseExecutor) {}

  async getDashboard(): Promise<AdministratorAnalytics> {
    const [summaryResult, categoriesResult, statusesResult, regionsResult, activityResult] = await Promise.all([
      this.database.execute<SummaryRow[]>(`
        SELECT
          COUNT(*) AS establishments,
          COALESCE(SUM(e.workflow_status = 'published'), 0) AS published,
          COALESCE(SUM(e.workflow_status = 'draft'), 0) AS drafts,
          COALESCE(SUM(e.workflow_status <> 'published'), 0) AS unpublished,
          COALESCE(SUM(
            NULLIF(TRIM(e.logo_url), '') IS NOT NULL
            AND (NULLIF(TRIM(e.email), '') IS NOT NULL OR NULLIF(TRIM(e.contact_number), '') IS NOT NULL)
            AND NULLIF(TRIM(e.summary), '') IS NOT NULL
            AND NULLIF(TRIM(e.region), '') IS NOT NULL
          ), 0) AS complete_profiles,
          COALESCE(SUM(NULLIF(TRIM(e.logo_url), '') IS NULL), 0) AS missing_logos,
          COALESCE(SUM(NULLIF(TRIM(e.email), '') IS NULL AND NULLIF(TRIM(e.contact_number), '') IS NULL), 0) AS missing_contact_information,
          COALESCE(SUM(NULLIF(TRIM(e.summary), '') IS NULL), 0) AS missing_descriptions,
          COALESCE(SUM(NULLIF(TRIM(e.region), '') IS NULL), 0) AS missing_regional_information
        FROM establishments e
      `),
      this.database.execute<CategoryRow[]>(`
        SELECT c.code, c.name, COUNT(e.id) AS count
        FROM categories c
        LEFT JOIN establishments e ON e.category_id = c.id
        GROUP BY c.id, c.code, c.name
        ORDER BY c.code ASC
      `),
      this.database.execute<WorkflowRow[]>(`
        SELECT e.workflow_status, COUNT(*) AS count
        FROM establishments e
        GROUP BY e.workflow_status
      `),
      this.database.execute<RegionRow[]>(`
        SELECT TRIM(e.region) AS region, COUNT(*) AS count
        FROM establishments e
        WHERE NULLIF(TRIM(e.region), '') IS NOT NULL
        GROUP BY TRIM(e.region)
        ORDER BY count DESC, region ASC
      `),
      this.database.execute<RecentActivityRow[]>(`
        SELECT e.id, e.name, c.code AS category_code, c.name AS category_name, e.workflow_status, e.updated_at
        FROM establishments e
        INNER JOIN categories c ON c.id = e.category_id
        ORDER BY e.updated_at DESC, e.id DESC
        LIMIT 8
      `),
    ])

    const summary = summaryResult[0][0]
    const total = numberFrom(summary?.establishments)
    const complete = numberFrom(summary?.complete_profiles)
    const statusCounts = new Map(statusesResult[0].map((row) => [row.workflow_status, numberFrom(row.count)]))

    return {
      totals: {
        establishments: total,
        published: numberFrom(summary?.published),
        drafts: numberFrom(summary?.drafts),
        unpublished: numberFrom(summary?.unpublished),
      },
      categories: categoriesResult[0].map((row): AnalyticsCategory => ({
        code: row.code,
        name: row.name,
        count: numberFrom(row.count),
      })),
      workflowStatuses: workflowStatusCodes.map((status): AnalyticsWorkflowStatus => ({
        status,
        count: statusCounts.get(status) ?? 0,
      })),
      profileCompleteness: {
        complete,
        total,
        percentage: total === 0 ? 0 : Math.round((complete / total) * 100),
        criteria: profileCriteria,
      },
      regions: regionsResult[0].map((row): AnalyticsRegion => ({
        region: row.region,
        count: numberFrom(row.count),
      })),
      recentActivity: activityResult[0].map((row): AnalyticsRecentActivity => ({
        id: Number(row.id),
        name: row.name,
        categoryCode: row.category_code,
        categoryName: row.category_name,
        workflowStatus: row.workflow_status,
        updatedAt: row.updated_at,
      })),
      attention: {
        missingLogos: numberFrom(summary?.missing_logos),
        missingContactInformation: numberFrom(summary?.missing_contact_information),
        missingDescriptions: numberFrom(summary?.missing_descriptions),
        missingRegionalInformation: numberFrom(summary?.missing_regional_information),
        supportsRegion: true,
      },
    }
  }
}
