import type { DatabaseTransaction, TransactionRunner } from '../config/database.js'
import {
  ConflictError,
  DatabaseUnavailableError,
  NotFoundError,
  ValidationError,
  isDuplicateKeyError,
} from '../lib/errors.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import type { EstablishmentManagerRepository, InternalRecordQuery } from '../repositories/establishment.repository.js'
import type { EstablishmentInput, EstablishmentRecord, PaginatedResult } from '../types/establishment.js'
import type { WorkflowStatusCode } from '../types/workflow.js'
import { slugFromName, validateEstablishmentInput } from '../validation/establishment.validation.js'

export type AdministratorEstablishmentInput = Partial<EstablishmentInput> & {
  published?: unknown
}

export type AdministratorEstablishmentListOptions = {
  page?: number
  pageSize?: number
  statuses?: readonly WorkflowStatusCode[]
}

const validId = (id: number) => Number.isSafeInteger(id) && id > 0

const publishedFromInput = (value: unknown, fallback: boolean) => {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new ValidationError('Invalid publication input.', { published: 'Use true or false.' })
  return value
}

export class AdministratorEstablishmentService {
  constructor(
    private readonly establishments: EstablishmentManagerRepository,
    private readonly categories: CategoryReader,
    private readonly transactions: TransactionRunner,
  ) {}

  async list(options: AdministratorEstablishmentListOptions = {}): Promise<PaginatedResult<EstablishmentRecord>> {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 20
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new ValidationError('Invalid establishment-list options.')
    }
    const query: InternalRecordQuery = { page, pageSize, ...(options.statuses ? { statuses: options.statuses } : {}) }
    try {
      return await this.establishments.listInternalRecords(query)
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async create(input: AdministratorEstablishmentInput): Promise<EstablishmentRecord> {
    const validated = validateEstablishmentInput(input)
    const publish = publishedFromInput(input.published, false)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        const category = await this.categories.findByCode(validated.categoryCode, transaction)
        if (!category) throw new ValidationError('Invalid establishment input.', { categoryId: 'Choose a configured category.' })
        const duplicate = await this.establishments.findByName(validated.name, transaction)
        if (duplicate) throw new ConflictError('An establishment with this name already exists.')
        const slug = await this.nextAvailableSlug(slugFromName(validated.name), transaction)
        const created = await this.establishments.createDraft({ ...validated, categoryDatabaseId: category.id, slug }, transaction)
        if (validated.management !== undefined) {
          await this.establishments.replaceManagement(created.id, validated.management, transaction)
        }
        return publish
          ? this.establishments.setPublicationStatus(created.id, true, transaction)
          : await this.getExisting(created.id, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async update(id: number, input: AdministratorEstablishmentInput): Promise<EstablishmentRecord> {
    this.assertId(id)
    const validated = validateEstablishmentInput(input)
    const publish = publishedFromInput(input.published, false)
    const publishingWasRequested = input.published !== undefined
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        const existing = await this.getExisting(id, transaction)
        const category = await this.categories.findByCode(validated.categoryCode, transaction)
        if (!category) throw new ValidationError('Invalid establishment input.', { categoryId: 'Choose a configured category.' })
        const duplicate = await this.establishments.findByName(validated.name, transaction)
        if (duplicate && duplicate.id !== id) throw new ConflictError('An establishment with this name already exists.')
        const updated = await this.establishments.updateEditableRecord(id, {
          ...validated,
          categoryDatabaseId: category.id,
          latitude: validated.latitude === undefined ? existing.latitude ?? null : validated.latitude,
          longitude: validated.longitude === undefined ? existing.longitude ?? null : validated.longitude,
        }, transaction)
        if (validated.management !== undefined) {
          await this.establishments.replaceManagement(id, validated.management, transaction)
        }
        return publishingWasRequested
          ? this.establishments.setPublicationStatus(updated.id, publish, transaction)
          : await this.getExisting(updated.id, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async setPublication(id: number, published: unknown): Promise<EstablishmentRecord> {
    this.assertId(id)
    const publicationState = publishedFromInput(published, false)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        await this.getExisting(id, transaction)
        return this.establishments.setPublicationStatus(id, publicationState, transaction)
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async delete(id: number): Promise<void> {
    this.assertId(id)
    try {
      await this.transactions.runInTransaction(async (transaction) => {
        await this.getExisting(id, transaction)
        const deleted = await this.establishments.deleteById(id, transaction)
        if (!deleted) throw new NotFoundError('The establishment record was not found.')
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  private async getExisting(id: number, transaction: DatabaseTransaction) {
    const existing = await this.establishments.findById(id, transaction)
    if (!existing) throw new NotFoundError('The establishment record was not found.')
    return existing
  }

  private async nextAvailableSlug(baseSlug: string, transaction: DatabaseTransaction) {
    for (let suffix = 1; suffix <= 10_000; suffix += 1) {
      const suffixText = suffix === 1 ? '' : `-${suffix}`
      const slug = `${baseSlug.slice(0, 160 - suffixText.length)}${suffixText}`
      const existing = await this.establishments.findBySlug(slug, transaction)
      if (!existing) return slug
    }
    throw new ConflictError('A unique establishment slug could not be allocated.')
  }

  private assertId(id: number) {
    if (!validId(id)) throw new ValidationError('Invalid establishment ID.', { id: 'Use a positive whole number.' })
  }

  private asServiceError(error: unknown) {
    if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError || error instanceof DatabaseUnavailableError) {
      return error
    }
    if (isDuplicateKeyError(error)) return new ConflictError('An establishment with this name or slug already exists.')
    return new DatabaseUnavailableError()
  }
}
