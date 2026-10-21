import { DatabaseUnavailableError } from '../lib/errors.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import type { PublicCategory } from '../types/establishment.js'

export interface CategoryEndpointService {
  listCategories(): Promise<PublicCategory[]>
}

export class CategoryService implements CategoryEndpointService {
  constructor(private readonly categories: CategoryReader) {}

  async listCategories(): Promise<PublicCategory[]> {
    try {
      const categories = await this.categories.list()
      return categories.map((category) => ({
        id: category.code.toLocaleLowerCase(),
        code: category.code,
        name: category.name,
        description: category.description,
      }))
    } catch {
      throw new DatabaseUnavailableError()
    }
  }
}
