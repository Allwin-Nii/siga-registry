import { describe, expect, it, vi } from 'vitest'
import type { DatabaseTransaction, TransactionRunner } from '../src/config/database.js'
import { ConflictError, InvalidWorkflowTransitionError, ValidationError } from '../src/lib/errors.js'
import type { CategoryReader } from '../src/repositories/category.repository.js'
import type { EstablishmentManagerRepository } from '../src/repositories/establishment.repository.js'
import { EstablishmentManagementService } from '../src/services/establishment-management.service.js'
import type { EstablishmentRecord } from '../src/types/establishment.js'
import type { WorkflowStatusCode } from '../src/types/workflow.js'

const category = { id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }

const record = (workflowStatus: WorkflowStatusCode = 'draft'): EstablishmentRecord => ({
  id: 1,
  slug: 'example-entity',
  name: 'Example Entity',
  website: 'https://example.test/',
  email: 'contact@example.test',
  contactNumber: '+233 302 000 000',
  summary: 'An example establishment description that meets the required length.',
  category,
  workflowStatus,
  createdAt: new Date('2026-10-21T00:00:00.000Z'),
  updatedAt: new Date('2026-10-21T00:00:00.000Z'),
  submittedAt: null,
  reviewedAt: null,
  reviewFeedback: null,
})

const validInput = {
  name: 'New Entity',
  categoryId: 'soe',
  website: 'https://new-entity.test/',
  email: 'info@new-entity.test',
  contactNumber: '+233 302 000 001',
  summary: 'A new establishment description that is long enough for validation.',
}

const transaction = {} as DatabaseTransaction
const transactionRunner: TransactionRunner = {
  runInTransaction: async (work) => work(transaction),
}

const categoryReader: CategoryReader = {
  list: async () => [category],
  findByCode: async (code) => code === 'SOE' ? category : undefined,
}

const createRepository = (current: EstablishmentRecord | undefined = record()) => {
  let currentRecord = current
  return {
    findPublishedDirectory: vi.fn(),
    findPublishedBySlug: vi.fn(),
    findById: vi.fn(async () => currentRecord),
    findByName: vi.fn(async () => undefined),
    findBySlug: vi.fn(async () => undefined),
    createDraft: vi.fn(async (input) => ({
      ...record(),
      id: 2,
      slug: input.slug,
      name: input.name,
      category: { ...category, id: input.categoryDatabaseId },
      website: input.website,
      email: input.email,
      contactNumber: input.contactNumber,
      summary: input.summary,
      workflowStatus: 'draft' as const,
    })),
    updateEditableRecord: vi.fn(async (_id, input) => ({
      ...currentRecord!,
      name: input.name,
      category: { ...category, id: input.categoryDatabaseId },
      website: input.website,
      email: input.email,
      contactNumber: input.contactNumber,
      summary: input.summary,
    })),
    updateWorkflow: vi.fn(async (_id, workflowStatus, reviewFeedback) => {
      currentRecord = { ...currentRecord!, workflowStatus, reviewFeedback }
      return currentRecord
    }),
    listInternalRecords: vi.fn(async (query) => ({
      data: currentRecord ? [currentRecord] : [],
      page: query.page,
      pageSize: query.pageSize,
      total: currentRecord ? 1 : 0,
      totalPages: currentRecord ? 1 : 0,
    })),
  } satisfies EstablishmentManagerRepository
}

const serviceFor = (repository: EstablishmentManagerRepository, categories: CategoryReader = categoryReader) =>
  new EstablishmentManagementService(repository, categories, transactionRunner)

describe('internal establishment management service', () => {
  it('validates and normalizes a new draft before writing it in a transaction', async () => {
    const repository = createRepository()
    const created = await serviceFor(repository).createDraft({ ...validInput, name: '  New   Entity  ' })

    expect(created).toMatchObject({ id: 2, name: 'New Entity', slug: 'new-entity', workflowStatus: 'draft' })
    expect(repository.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Entity', categoryDatabaseId: 1, slug: 'new-entity',
    }), transaction)
  })

  it('rejects invalid input and duplicate establishment names before unsafe writes', async () => {
    const invalidRepository = createRepository()
    await expect(serviceFor(invalidRepository).createDraft({ ...validInput, summary: 'Too short' }))
      .rejects.toBeInstanceOf(ValidationError)
    expect(invalidRepository.createDraft).not.toHaveBeenCalled()

    const duplicateRepository = createRepository()
    duplicateRepository.findByName.mockResolvedValue(record())
    await expect(serviceFor(duplicateRepository).createDraft(validInput)).rejects.toBeInstanceOf(ConflictError)
    expect(duplicateRepository.createDraft).not.toHaveBeenCalled()
  })

  it('allocates a suffix when a normalized slug is already in use and maps database duplicate errors safely', async () => {
    const repository = createRepository()
    repository.findBySlug.mockImplementation(async (slug) => slug === 'new-entity' ? record() : undefined)
    await serviceFor(repository).createDraft(validInput)
    expect(repository.createDraft).toHaveBeenCalledWith(expect.objectContaining({ slug: 'new-entity-2' }), transaction)

    const duplicateAtDatabase = createRepository()
    duplicateAtDatabase.createDraft.mockRejectedValue({ code: 'ER_DUP_ENTRY' })
    await expect(serviceFor(duplicateAtDatabase).createDraft(validInput)).rejects.toBeInstanceOf(ConflictError)
  })

  it('allows only defined workflow transitions and requires feedback for changes and rejection', async () => {
    const draftRepository = createRepository(record('draft'))
    const draftService = serviceFor(draftRepository)
    await expect(draftService.submitForReview(1)).resolves.toMatchObject({ workflowStatus: 'pending_review' })
    expect(draftRepository.updateWorkflow).toHaveBeenCalledWith(1, 'pending_review', null, transaction)

    const pendingRepository = createRepository(record('pending_review'))
    const pendingService = serviceFor(pendingRepository)
    await expect(pendingService.requestChanges(1, '')).rejects.toBeInstanceOf(ValidationError)
    await expect(pendingService.requestChanges(1, 'Please add a source for the contact number.'))
      .resolves.toMatchObject({ workflowStatus: 'changes_requested' })

    const approvalRepository = createRepository(record('pending_review'))
    await expect(serviceFor(approvalRepository).approve(1, 'Verified against the submitted evidence.'))
      .resolves.toMatchObject({ workflowStatus: 'published' })
    expect(approvalRepository.updateWorkflow).toHaveBeenCalledWith(
      1, 'published', 'Verified against the submitted evidence.', transaction,
    )

    const rejectionRepository = createRepository(record('pending_review'))
    await expect(serviceFor(rejectionRepository).reject(1, 'The entity name requires correction.'))
      .resolves.toMatchObject({ workflowStatus: 'rejected' })

    const publishedRepository = createRepository(record('published'))
    await expect(serviceFor(publishedRepository).submitForReview(1)).rejects.toBeInstanceOf(InvalidWorkflowTransitionError)
    expect(publishedRepository.updateWorkflow).not.toHaveBeenCalled()
  })

  it('updates editable drafts, rejects unknown IDs, and keeps future dashboard retrieval internal', async () => {
    const repository = createRepository(record('changes_requested'))
    const service = serviceFor(repository)
    await expect(service.updateDraft(1, validInput)).resolves.toMatchObject({ name: validInput.name })
    await expect(service.updateDraft(0, validInput)).rejects.toBeInstanceOf(ValidationError)

    const records = await service.retrieveRecords({ page: 1, pageSize: 10, statuses: ['changes_requested'] })
    expect(records.data).toHaveLength(1)
    expect(repository.listInternalRecords).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      statuses: ['changes_requested'],
    })
  })
})
