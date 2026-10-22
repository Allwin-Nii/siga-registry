import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type { RegistryCategory } from '../types/establishment.js'
import type { CategoryInput } from '../validation/category.validation.js'

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

export interface CategoryManagerRepository extends CategoryReader {
  findById(id: number, executor?: DatabaseExecutor): Promise<RegistryCategory | undefined>
  create(input: CategoryInput, executor?: DatabaseExecutor): Promise<RegistryCategory>
  update(id: number, input: CategoryInput, executor?: DatabaseExecutor): Promise<RegistryCategory>
  countEstablishmentReferences(id: number, executor?: DatabaseExecutor): Promise<number>
  deleteById(id: number, executor?: DatabaseExecutor): Promise<boolean>
}

export class CategoryRepository implements CategoryManagerRepository {
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

  async findById(id: number, executor: DatabaseExecutor = this.database): Promise<RegistryCategory | undefined> {
    const [rows] = await executor.execute<CategoryRow[]>(`
      SELECT id, code, name, description
      FROM categories
      WHERE id = ?
      LIMIT 1
    `, [id])
    return rows[0] ? toCategory(rows[0]) : undefined
  }

  async create(input: CategoryInput, executor: DatabaseExecutor = this.database): Promise<RegistryCategory> {
    const [result] = await executor.execute<ResultSetHeader>(`
      INSERT INTO categories (code, name, description)
      VALUES (?, ?, ?)
    `, [input.code, input.name, input.description])
    const created = await this.findById(result.insertId, executor)
    if (!created) throw new Error('Created category could not be read.')
    return created
  }

  async update(id: number, input: CategoryInput, executor: DatabaseExecutor = this.database): Promise<RegistryCategory> {
    await executor.execute<ResultSetHeader>(`
      UPDATE categories
      SET code = ?, name = ?, description = ?
      WHERE id = ?
    `, [input.code, input.name, input.description, id])
    const updated = await this.findById(id, executor)
    if (!updated) throw new Error('Updated category could not be read.')
    return updated
  }

  async countEstablishmentReferences(id: number, executor: DatabaseExecutor = this.database) {
    const [rows] = await executor.execute<(RowDataPacket & { total: number })[]>(`
      SELECT COUNT(*) AS total
      FROM establishments
      WHERE category_id = ?
    `, [id])
    return Number(rows[0]?.total ?? 0)
  }

  async deleteById(id: number, executor: DatabaseExecutor = this.database) {
    const [result] = await executor.execute<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id])
    return result.affectedRows === 1
  }
}
