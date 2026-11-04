import type { WorkflowStatusCode } from './workflow.js'

export type AnalyticsCategory = {
  code: string
  name: string
  count: number
}

export type AnalyticsWorkflowStatus = {
  status: WorkflowStatusCode
  count: number
}

export type AnalyticsRegion = {
  region: string
  count: number
}

export type AnalyticsRecentActivity = {
  id: number
  name: string
  categoryCode: string
  categoryName: string
  workflowStatus: WorkflowStatusCode
  updatedAt: Date
}

export type AdministratorAnalytics = {
  totals: {
    establishments: number
    published: number
    drafts: number
    unpublished: number
  }
  categories: AnalyticsCategory[]
  workflowStatuses: AnalyticsWorkflowStatus[]
  profileCompleteness: {
    complete: number
    total: number
    percentage: number
    criteria: string[]
  }
  regions: AnalyticsRegion[]
  recentActivity: AnalyticsRecentActivity[]
  attention: {
    missingLogos: number
    missingContactInformation: number
    missingDescriptions: number
    missingRegionalInformation: number
    supportsRegion: boolean
  }
}
