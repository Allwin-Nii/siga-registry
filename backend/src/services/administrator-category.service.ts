import type { DatabaseTransaction, TransactionRunner } from '../config/database.js'
import {
  ConflictError,
  DatabaseUnavailableError,
  NotFoundError,
  ValidationError,
  isDuplicateKeyError,
  isForeignKeyReferenceError,
} from '../lib/errors.js'
import type { CategoryManagerRepository } from '../repositories/category.repository.js'
import type { RegistryCategory } from '../types/establishment.js'
import { type CategoryInput, validateCategoryInput } from '../validation/category.validation.js'

const validId = (id: number) => Number.isSafeInteger(id) && id > 0

export class AdministratorCategoryService {
  constructor(
    private readonly categories: CategoryManagerRepository,
    private readonly transactions: TransactionRunner,
  ) {}

  async list(): Promise<RegistryCategory[]> {
    try {
      return await this.categories.list()
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async create(input: Partial<CategoryInput>): Promise<RegistryCategory> {
    const validated = validateCategoryInput(input)
    try {
      return await this.transactions.runInTransaction((transaction) => this.categories.create(validated, transaction))
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  async update(id: number, input: Partial<CategoryInput>): Promise<RegistryCategory> {
    this.assertId(id)
    const validated = validateCategoryInput(input)
    try {
      return await this.transactions.runInTransaction(async (transaction) => {
        await this.getExisting(id, transaction)
        return this.categories.update(id, validated, transaction)
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
        if (await this.categories.countEstablishmentReferences(id, transaction) > 0) {
          throw new ConflictError('A category with establishment records cannot be deleted.')
        }
        const deleted = await this.categories.deleteById(id, transaction)
        if (!deleted) throw new NotFoundError('The category was not found.')
      })
    } catch (error) {
      throw this.asServiceError(error)
    }
  }

  private async getExisting(id: number, transaction: DatabaseTransaction) {
    const existing = await this.categories.findById(id, transaction)
    if (!existing) throw new NotFoundError('The category was not found.')
    return existing
  }

  private assertId(id: number) {
    if (!validId(id)) throw new ValidationError('Invalid category ID.', { id: 'Use a positive whole number.' })
  }

  private asServiceError(error: unknown) {
    if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError || error instanceof DatabaseUnavailableError) {
      return error
    }
    if (isDuplicateKeyError(error)) return new ConflictError('A category with this code already exists.')
    if (isForeignKeyReferenceError(error)) return new ConflictError('A category with establishment records cannot be deleted.')
    return new DatabaseUnavailableError()
  }
}
