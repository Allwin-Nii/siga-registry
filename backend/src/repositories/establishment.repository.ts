import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DatabaseExecutor } from '../config/database.js'
import type {
  DirectoryQuery,
  EstablishmentRecord,
  PaginatedResult,
  PublicEstablishment,
  RegistryCategory,
  ValidatedEstablishmentInput,
} from '../types/establishment.js'
import type { WorkflowStatusCode } from '../types/workflow.js'

type EstablishmentRow = RowDataPacket & {
  id: number
  slug: string
  name: string
  website_url: string | null
  email: string | null
  contact_number: string | null
  summary: string
  workflow_status: WorkflowStatusCode
  created_at: Date
  updated_at: Date
  submitted_at: Date | null
  reviewed_at: Date | null
  review_feedback: string | null
  category_id: number
  category_code: string
  category_name: string
  category_description: string
}

type CountRow = RowDataPacket & { total: number }

const establishmentColumns = `
  e.id,
  e.slug,
  e.name,
  e.website_url,
  e.email,
  e.contact_number,
  e.summary,
  e.workflow_status,
  e.created_at,
  e.updated_at,
  e.submitted_at,
  e.reviewed_at,
  e.review_feedback,
  c.id AS category_id,
  c.code AS category_code,
  c.name AS category_name,
  c.description AS category_description
`

const categoryFromRow = (row: EstablishmentRow): RegistryCategory => ({
  id: row.category_id,
  code: row.category_code,
  name: row.category_name,
  description: row.category_description,
})

const toRecord = (row: EstablishmentRow): EstablishmentRecord => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  website: row.website_url,
  email: row.email,
  contactNumber: row.contact_number,
  summary: row.summary,
  category: categoryFromRow(row),
  workflowStatus: row.workflow_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at,
  reviewFeedback: row.review_feedback,
})

const toPublicEstablishment = (record: EstablishmentRecord): PublicEstablishment => {
  const categoryId = record.category.code.toLocaleLowerCase()
  return {
    id: String(record.id),
    slug: record.slug,
    name: record.name,
    website: record.website ?? '',
    categoryId,
    category: {
      id: categoryId,
      code: record.category.code,
      name: record.category.name,
      description: record.category.description,
    },
    email: record.email ?? '',
    contactNumber: record.contactNumber ?? '',
    summary: record.summary,
  }
}

const escapeLike = (value: string) => value.replace(/[!%_]/g, (character) => `!${character}`)

const createPublicConditions = (query: DirectoryQuery) => {
  const conditions = ["e.workflow_status = 'published'"]
  const parameters: (string | number)[] = []

  if (query.search) {
    conditions.push("LOWER(e.name) LIKE LOWER(?) ESCAPE '!'")
    parameters.push(`%${escapeLike(query.search)}%`)
  }
  if (query.categoryCode) {
    conditions.push('c.code = ?')
    parameters.push(query.categoryCode)
  }

  return { clause: conditions.join(' AND '), parameters }
}

export type CreateDraftRecord = ValidatedEstablishmentInput & {
  categoryDatabaseId: number
  slug: string
}

export type UpdateDraftRecord = ValidatedEstablishmentInput & {
  categoryDatabaseId: number
}

export type InternalRecordQuery = {
  page: number
  pageSize: number
  statuses?: readonly WorkflowStatusCode[]
}

export interface EstablishmentReader {
  findPublishedDirectory(query: DirectoryQuery): Promise<PaginatedResult<PublicEstablishment>>
  findPublishedBySlug(slug: string): Promise<PublicEstablishment | undefined>
}

export interface EstablishmentManagerRepository extends EstablishmentReader {
  findById(id: number, executor?: DatabaseExecutor): Promise<EstablishmentRecord | undefined>
  findByName(name: string, executor?: DatabaseExecutor): Promise<EstablishmentRecord | undefined>
  findBySlug(slug: string, executor?: DatabaseExecutor): Promise<EstablishmentRecord | undefined>
  createDraft(input: CreateDraftRecord, executor?: DatabaseExecutor): Promise<EstablishmentRecord>
  updateEditableRecord(id: number, input: UpdateDraftRecord, executor?: DatabaseExecutor): Promise<EstablishmentRecord>
  updateWorkflow(
    id: number,
    workflowStatus: WorkflowStatusCode,
    reviewFeedback: string | null,
    executor?: DatabaseExecutor,
  ): Promise<EstablishmentRecord>
  listInternalRecords(query: InternalRecordQuery): Promise<PaginatedResult<EstablishmentRecord>>
}

export class EstablishmentRepository implements EstablishmentManagerRepository {
  constructor(private readonly database: DatabaseExecutor) {}

  async findPublishedDirectory(query: DirectoryQuery): Promise<PaginatedResult<PublicEstablishment>> {
    const { clause, parameters } = createPublicConditions(query)
    const [countRows] = await this.database.execute<CountRow[]>(`
      SELECT COUNT(*) AS total
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE ${clause}
    `, parameters)
    const [rows] = await this.database.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE ${clause}
      ORDER BY e.name ASC, e.id ASC
      LIMIT ? OFFSET ?
    `, [...parameters, query.pageSize, (query.page - 1) * query.pageSize])
    const total = Number(countRows[0]?.total ?? 0)

    return {
      data: rows.map((row) => toPublicEstablishment(toRecord(row))),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    }
  }

  async findPublishedBySlug(slug: string): Promise<PublicEstablishment | undefined> {
    const [rows] = await this.database.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE e.slug = ? AND e.workflow_status = 'published'
      LIMIT 1
    `, [slug])
    return rows[0] ? toPublicEstablishment(toRecord(rows[0])) : undefined
  }

  async findById(id: number, executor: DatabaseExecutor = this.database): Promise<EstablishmentRecord | undefined> {
    const [rows] = await executor.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE e.id = ?
      LIMIT 1
    `, [id])
    return rows[0] ? toRecord(rows[0]) : undefined
  }

  async findByName(name: string, executor: DatabaseExecutor = this.database): Promise<EstablishmentRecord | undefined> {
    const [rows] = await executor.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE e.name = ?
      LIMIT 1
    `, [name])
    return rows[0] ? toRecord(rows[0]) : undefined
  }

  async findBySlug(slug: string, executor: DatabaseExecutor = this.database): Promise<EstablishmentRecord | undefined> {
    const [rows] = await executor.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      WHERE e.slug = ?
      LIMIT 1
    `, [slug])
    return rows[0] ? toRecord(rows[0]) : undefined
  }

  async createDraft(input: CreateDraftRecord, executor: DatabaseExecutor = this.database): Promise<EstablishmentRecord> {
    const [result] = await executor.execute<ResultSetHeader>(`
      INSERT INTO establishments (
        name, website_url, category_id, email, contact_number, summary, slug, workflow_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `, [
      input.name,
      input.website,
      input.categoryDatabaseId,
      input.email,
      input.contactNumber,
      input.summary,
      input.slug,
    ])
    const created = await this.findById(result.insertId, executor)
    if (!created) throw new Error('Created establishment could not be read.')
    return created
  }

  async updateEditableRecord(
    id: number,
    input: UpdateDraftRecord,
    executor: DatabaseExecutor = this.database,
  ): Promise<EstablishmentRecord> {
    await executor.execute<ResultSetHeader>(`
      UPDATE establishments
      SET name = ?, website_url = ?, category_id = ?, email = ?, contact_number = ?, summary = ?
      WHERE id = ?
    `, [
      input.name,
      input.website,
      input.categoryDatabaseId,
      input.email,
      input.contactNumber,
      input.summary,
      id,
    ])
    const updated = await this.findById(id, executor)
    if (!updated) throw new Error('Updated establishment could not be read.')
    return updated
  }

  async updateWorkflow(
    id: number,
    workflowStatus: WorkflowStatusCode,
    reviewFeedback: string | null,
    executor: DatabaseExecutor = this.database,
  ): Promise<EstablishmentRecord> {
    if (workflowStatus === 'pending_review') {
      await executor.execute<ResultSetHeader>(`
        UPDATE establishments
        SET workflow_status = ?, submitted_at = CURRENT_TIMESTAMP(3), reviewed_at = NULL, review_feedback = NULL
        WHERE id = ?
      `, [workflowStatus, id])
    } else {
      await executor.execute<ResultSetHeader>(`
        UPDATE establishments
        SET workflow_status = ?, reviewed_at = CURRENT_TIMESTAMP(3), review_feedback = ?
        WHERE id = ?
      `, [workflowStatus, reviewFeedback, id])
    }
    const updated = await this.findById(id, executor)
    if (!updated) throw new Error('Updated establishment could not be read.')
    return updated
  }

  async listInternalRecords(query: InternalRecordQuery): Promise<PaginatedResult<EstablishmentRecord>> {
    const parameters: (string | number)[] = []
    const conditions: string[] = []
    if (query.statuses && query.statuses.length > 0) {
      conditions.push(`e.workflow_status IN (${query.statuses.map(() => '?').join(', ')})`)
      parameters.push(...query.statuses)
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const [countRows] = await this.database.execute<CountRow[]>(`
      SELECT COUNT(*) AS total
      FROM establishments e
      ${whereClause}
    `, parameters)
    const [rows] = await this.database.execute<EstablishmentRow[]>(`
      SELECT ${establishmentColumns}
      FROM establishments e
      INNER JOIN categories c ON c.id = e.category_id
      ${whereClause}
      ORDER BY e.updated_at DESC, e.id DESC
      LIMIT ? OFFSET ?
    `, [...parameters, query.pageSize, (query.page - 1) * query.pageSize])
    const total = Number(countRows[0]?.total ?? 0)
    return {
      data: rows.map(toRecord),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    }
  }
}
