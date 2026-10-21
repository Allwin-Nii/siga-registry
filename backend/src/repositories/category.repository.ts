import type { RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type { RegistryCategory } from '../types/establishment.js'

type CategoryRow = RowDataPacket & {
  id: number
  code: string
  name: string
  description: string
}

const toCategory = (row: CategoryRow): RegistryCategory => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
})

export interface CategoryReader {
  list(executor?: DatabaseExecutor): Promise<RegistryCategory[]>
  findByCode(code: string, executor?: DatabaseExecutor): Promise<RegistryCategory | undefined>
}

export class CategoryRepository implements CategoryReader {
  constructor(private readonly database: DatabaseExecutor) {}

  async list(executor: DatabaseExecutor = this.database): Promise<RegistryCategory[]> {
    const [rows] = await executor.execute<CategoryRow[]>(`
      SELECT id, code, name, description
      FROM categories
      ORDER BY id ASC
    `)
    return rows.map(toCategory)
  }

  async findByCode(code: string, executor: DatabaseExecutor = this.database): Promise<RegistryCategory | undefined> {
    const [rows] = await executor.execute<CategoryRow[]>(`
      SELECT id, code, name, description
      FROM categories
      WHERE code = ?
      LIMIT 1
    `, [code])
    return rows[0] ? toCategory(rows[0]) : undefined
  }
}
