import {
  ConflictError,
  DatabaseUnavailableError,
  InvalidWorkflowTransitionError,
  NotFoundError,
  ValidationError,
  isDuplicateKeyError,
} from '../lib/errors.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import type {
  EstablishmentManagerRepository,
  InternalRecordQuery,
} from '../repositories/establishment.repository.js'
import type { TransactionRunner } from '../config/database.js'
import type { EstablishmentInput, EstablishmentRecord, PaginatedResult } from '../types/establishment.js'
import { workflowStatusCodes, type WorkflowStatusCode } from '../types/workflow.js'
import { slugFromName, validateEstablishmentInput, validateReviewFeedback } from '../validation/establishment.validation.js'

export type InternalRecordListOptions = {
  page?: number
  pageSize?: number
  statuses?: readonly WorkflowStatusCode[]
}

const validRecordId = (id: number) => Number.isSafeInteger(id) && id > 0

export class EstablishmentManagementService {
  constructor(
    private readonly establishments: EstablishmentManagerRepository,
    private readonly categories: CategoryReader,
    private readonly transactions: TransactionRunner,
  ) {}

  async createDraft(input: Partial<EstablishmentInput>): Promise<EstablishmentRecord> {
    const validated = validateEstablishmentInput(input)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        const category = await this.categories.findByCode(validated.categoryCode, transaction)
        if (!category) {
          throw new ValidationError('Invalid establishment input.', { categoryId: 'Choose a configured category.' })
        }
        const duplicate = await this.establishments.findByName(validated.name, transaction)
        if (duplicate) throw new ConflictError('An establishment with this name already exists.')
        const slug = await this.nextAvailableSlug(slugFromName(validated.name), transaction)
        return this.establishments.createDraft({ ...validated, categoryDatabaseId: category.id, slug }, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async updateDraft(id: number, input: Partial<EstablishmentInput>): Promise<EstablishmentRecord> {
    this.assertRecordId(id)
    const validated = validateEstablishmentInput(input)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        const current = await this.getExistingRecord(id, transaction)
        if (current.workflowStatus !== 'draft' && current.workflowStatus !== 'changes_requested') {
          throw new InvalidWorkflowTransitionError('Only draft or changes-requested records can be edited.')
        }
        const category = await this.categories.findByCode(validated.categoryCode, transaction)
        if (!category) {
          throw new ValidationError('Invalid establishment input.', { categoryId: 'Choose a configured category.' })
        }
        const duplicate = await this.establishments.findByName(validated.name, transaction)
        if (duplicate && duplicate.id !== id) throw new ConflictError('An establishment with this name already exists.')
        return this.establishments.updateEditableRecord(id, { ...validated, categoryDatabaseId: category.id }, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async submitForReview(id: number): Promise<EstablishmentRecord> {
    return this.changeStatus(id, ['draft', 'changes_requested'], 'pending_review', null)
  }

  async approve(id: number, feedback?: unknown): Promise<EstablishmentRecord> {
    return this.review(id, 'published', feedback, false)
  }

  async requestChanges(id: number, feedback: unknown): Promise<EstablishmentRecord> {
    return this.review(id, 'changes_requested', feedback, true)
  }

  async reject(id: number, feedback: unknown): Promise<EstablishmentRecord> {
    return this.review(id, 'rejected', feedback, true)
  }

  async retrieveRecords(options: InternalRecordListOptions = {}): Promise<PaginatedResult<EstablishmentRecord>> {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new ValidationError('Invalid record-list options.')
    }
    if (options.statuses?.some((status) => !workflowStatusCodes.includes(status))) {
      throw new ValidationError('Invalid record-list options.', { statuses: 'Use configured workflow statuses.' })
    }
    const query: InternalRecordQuery = { page, pageSize, ...(options.statuses ? { statuses: options.statuses } : {}) }
    try {
      return await this.establishments.listInternalRecords(query)
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  private async review(
    id: number,
    targetStatus: 'published' | 'changes_requested' | 'rejected',
    feedback: unknown,
    feedbackRequired: boolean,
  ) {
    const normalizedFeedback = validateReviewFeedback(feedback, feedbackRequired)
    return this.changeStatus(id, ['pending_review'], targetStatus, normalizedFeedback)
  }

  private async changeStatus(
    id: number,
    permittedCurrentStatuses: readonly WorkflowStatusCode[],
    targetStatus: WorkflowStatusCode,
    reviewFeedback: string | null,
  ): Promise<EstablishmentRecord> {
    this.assertRecordId(id)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        const current = await this.getExistingRecord(id, transaction)
        if (!permittedCurrentStatuses.includes(current.workflowStatus)) {
          throw new InvalidWorkflowTransitionError()
        }
        return this.establishments.updateWorkflow(id, targetStatus, reviewFeedback, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  private async getExistingRecord(id: number, transaction: Parameters<TransactionRunner['runInTransaction']>[0] extends (transaction: infer T) => Promise<unknown> ? T : never) {
    const current = await this.establishments.findById(id, transaction)
    if (!current) throw new NotFoundError('The establishment record was not found.')
    return current
  }

  private async nextAvailableSlug(
    baseSlug: string,
    transaction: Parameters<TransactionRunner['runInTransaction']>[0] extends (transaction: infer T) => Promise<unknown> ? T : never,
  ) {
    for (let suffix = 1; suffix <= 10_000; suffix += 1) {
      const suffixText = suffix === 1 ? '' : `-${suffix}`
      const slug = `${baseSlug.slice(0, 160 - suffixText.length)}${suffixText}`
      const existing = await this.establishments.findBySlug(slug, transaction)
      if (!existing) return slug
    }
    throw new ConflictError('A unique establishment slug could not be allocated.')
  }

  private assertRecordId(id: number) {
    if (!validRecordId(id)) throw new ValidationError('Invalid establishment record ID.', { id: 'Use a positive whole number.' })
  }

  private asServiceError(error: unknown) {
    if (
      error instanceof ValidationError ||
      error instanceof ConflictError ||
      error instanceof InvalidWorkflowTransitionError ||
      error instanceof NotFoundError ||
      error instanceof DatabaseUnavailableError
    ) return error
    if (isDuplicateKeyError(error)) return new ConflictError('An establishment with this name or slug already exists.')
    return new DatabaseUnavailableError()
  }
}
