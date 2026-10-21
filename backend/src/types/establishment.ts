import type { WorkflowStatusCode } from './workflow.js'

export type RegistryCategory = {
  id: number
  code: string
  name: string
  description: string
}

export type PublicCategory = {
  id: string
  code: string
  name: string
  description: string
}

export type EstablishmentInput = {
  name: string
  categoryId: string
  website: string | null
  email: string | null
  contactNumber: string | null
  summary: string
}

export type ValidatedEstablishmentInput = Omit<EstablishmentInput, 'categoryId'> & {
  categoryCode: string
}

export type EstablishmentRecord = {
  id: number
  slug: string
  name: string
  website: string | null
  email: string | null
  contactNumber: string | null
  summary: string
  category: RegistryCategory
  workflowStatus: WorkflowStatusCode
  createdAt: Date
  updatedAt: Date
  submittedAt: Date | null
  reviewedAt: Date | null
  reviewFeedback: string | null
}

export type PublicEstablishment = {
  id: string
  slug: string
  name: string
  website: string
  categoryId: string
  category: PublicCategory
  email: string
  contactNumber: string
  summary: string
}

export type DirectoryQuery = {
  search?: string
  categoryCode?: string
  page: number
  pageSize: number
}

export type PaginatedResult<T> = {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
