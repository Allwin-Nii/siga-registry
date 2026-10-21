export const workflowStatusCodes = [
  'draft',
  'pending_review',
  'published',
  'changes_requested',
  'rejected',
] as const

export type WorkflowStatusCode = (typeof workflowStatusCodes)[number]

export const frontendWorkflowLabels: Record<WorkflowStatusCode, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
}
