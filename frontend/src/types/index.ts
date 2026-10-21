export type RecordStatus = 'Draft' | 'Pending review' | 'Published' | 'Changes requested' | 'Rejected'

export type Category = {
  id: string
  name: string
  description: string
}

export type EstablishmentInput = {
  name: string
  categoryId: string
  email: string
  contactNumber: string
  website: string
  summary: string
}

export type EstablishmentFormInput = EstablishmentInput

export type EstablishmentValidationErrors = Partial<Record<keyof EstablishmentInput, string>>

export type ReviewDecision = 'approve' | 'request_changes' | 'reject'

export type WorkflowFeedback = {
  decision: ReviewDecision
  message?: string
  reviewedAt: string
}

export type Establishment = EstablishmentInput & {
  id: string
  slug: string
  status: RecordStatus
  lastUpdated: string
  owner?: string
  staffUpdated?: string
  reviewFeedback?: WorkflowFeedback
}
