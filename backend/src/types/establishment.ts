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
  logoUrl?: string | null
  email: string | null
  contactNumber: string | null
  summary: string
  region?: string | null
  city?: string | null
  physicalAddress?: string | null
  gpsAddress?: string | null
  latitude?: number | null
  longitude?: number | null
  management?: ManagementMemberInput[]
}

export type ValidatedEstablishmentInput = Omit<EstablishmentInput, 'categoryId' | 'management'> & {
  categoryCode: string
  management?: ValidatedManagementMemberInput[]
}

export type ManagementMemberInput = {
  fullName: string
  position: string
  officialEmail: string | null
  officialPhone: string | null
}

export type ValidatedManagementMemberInput = ManagementMemberInput & {
  displayOrder: number
}

export type ManagementMember = ValidatedManagementMemberInput & {
  id: number
}

export type EstablishmentRecord = {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl?: string | null
  email: string | null
  contactNumber: string | null
  summary: string
  region?: string | null
  city?: string | null
  physicalAddress?: string | null
  gpsAddress?: string | null
  latitude?: number | null
  longitude?: number | null
  management?: ManagementMember[]
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
  logoUrl?: string
  categoryId: string
  category: PublicCategory
  email: string
  contactNumber: string
  summary: string
  region?: string
  city?: string
  physicalAddress?: string
  gpsAddress?: string
  latitude?: number | null
  longitude?: number | null
  management?: ManagementMember[]
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
