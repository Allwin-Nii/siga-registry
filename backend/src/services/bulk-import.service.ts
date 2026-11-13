import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import ExcelJS from 'exceljs'
import { ConflictError, DatabaseUnavailableError, NotFoundError, ValidationError } from '../lib/errors.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import type { EstablishmentManagerRepository } from '../repositories/establishment.repository.js'
import type { EstablishmentInput, EstablishmentRecord } from '../types/establishment.js'
import { normalizeWhitespace, validateEstablishmentInput } from '../validation/establishment.validation.js'
import type { AdministratorEstablishmentService } from './administrator-establishment.service.js'

const maximumFileBytes = 5 * 1024 * 1024
const maximumRows = 500
const previewLifetimeMs = 15 * 60 * 1000
const supportedCategories = new Set(['SOE', 'JVC', 'OSE'])

const importColumns = [
  'Entity Name',
  'Category',
  'Website URL',
  'Email Address',
  'Contact Number',
] as const

type ImportColumn = typeof importColumns[number]

export type BulkImportRow = {
  rowNumber: number
  values: Record<ImportColumn, string>
  status: 'valid' | 'invalid' | 'duplicate'
  errors: Record<string, string>
}

export type BulkImportPreview = {
  id: string
  expiresAt: string
  total: number
  valid: number
  invalid: number
  duplicates: number
  rows: BulkImportRow[]
}

export type BulkImportSummary = {
  imported: Array<{ rowNumber: number, id: number, name: string }>
  skippedDuplicates: Array<{ rowNumber: number, name: string, message: string }>
  rejected: Array<{ rowNumber: number, name: string, errors: Record<string, string> }>
}

export type BulkImportFile = {
  body: Buffer
  filename: string
  contentType: string
}

type StoredPreview = BulkImportPreview & { createdAt: number }

const emptyValues = (): Record<ImportColumn, string> => Object.fromEntries(importColumns.map((column) => [column, ''])) as Record<ImportColumn, string>
const textValue = (value: ExcelJS.CellValue | undefined) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && 'formula' in value) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

const canonicalHeader = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')
const headerAliases: Record<string, ImportColumn> = {
  entityname: 'Entity Name',
  category: 'Category',
  websiteurl: 'Website URL',
  emailaddress: 'Email Address',
  contactnumber: 'Contact Number',
}

const normalizedName = (value: string) => normalizeWhitespace(value).toLocaleLowerCase()
const isXlsx = (file: BulkImportFile) => file.filename.toLocaleLowerCase().endsWith('.xlsx') && file.body.length >= 4 && file.body.subarray(0, 2).toString('ascii') === 'PK'
const isCsv = (file: BulkImportFile) => {
  if (!file.filename.toLocaleLowerCase().endsWith('.csv') || file.body.includes(0)) return false
  const text = file.body.toString('utf8')
  return Buffer.from(text, 'utf8').equals(file.body)
}
const inputFromRow = (row: BulkImportRow): EstablishmentInput => ({
  name: row.values['Entity Name'],
  categoryId: row.values.Category.toLocaleUpperCase(),
  website: row.values['Website URL'],
  email: row.values['Email Address'],
  contactNumber: row.values['Contact Number'],
  summary: 'This entity was imported as a draft. Complete its profile before publication.',
  management: [],
})

const summarize = (id: string, rows: BulkImportRow[]): BulkImportPreview => ({
  id,
  expiresAt: new Date(Date.now() + previewLifetimeMs).toISOString(),
  total: rows.length,
  valid: rows.filter((row) => row.status === 'valid').length,
  invalid: rows.filter((row) => row.status === 'invalid').length,
  duplicates: rows.filter((row) => row.status === 'duplicate').length,
  rows,
})

const safeCsvCell = (value: string) => {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

export class BulkImportService {
  private readonly previews = new Map<string, StoredPreview>()

  constructor(
    private readonly establishments: Pick<EstablishmentManagerRepository, 'findByName'>,
    private readonly categories: Pick<CategoryReader, 'list'>,
    private readonly administratorEstablishments: Pick<AdministratorEstablishmentService, 'create'>,
  ) {}

  async createTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SIGA Registry'
    const entities = workbook.addWorksheet('Entities', { views: [{ state: 'frozen', ySplit: 1 }] })
    entities.addRow(importColumns)
    entities.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    entities.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082F49' } }
    entities.autoFilter = { from: 'A1', to: 'E1' }
    entities.columns = importColumns.map((header) => ({ header, key: header, width: Math.max(16, Math.min(34, header.length + 5)) }))

    const instructions = workbook.addWorksheet('Instructions')
    instructions.columns = [{ width: 28 }, { width: 100 }]
    instructions.addRows([
      ['SIGA Registry bulk import', 'Use the Entities sheet for up to 500 new entities.'],
      ['Required fields', 'Entity Name and Category must be present.'],
      ['Category values', 'Use SOE, JVC, or OSE exactly.'],
      ['Optional fields', 'Website URL, Email Address, and Contact Number may be blank.'],
      ['After import', 'Add descriptions, images, supervising ministries, location details, and members from entity management.'],
      ['Duplicates', 'Duplicate entity names in this file or already in the registry are skipped. Imported records are created as drafts only.'],
      ['Formats', 'Save as .xlsx or UTF-8 .csv. Formulas and macros are not imported.'],
    ])
    instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082F49' } }
    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  async preview(file: BulkImportFile): Promise<BulkImportPreview> {
    this.pruneExpiredPreviews()
    if (file.body.length === 0 || file.body.length > maximumFileBytes) {
      throw new ValidationError('Invalid import file.', { file: 'Choose an Excel or CSV file no larger than 5 MB.' })
    }
    if (!isXlsx(file) && !isCsv(file)) {
      throw new ValidationError('Invalid import file.', { file: 'Choose a valid .xlsx or .csv file.' })
    }

    const rows = isXlsx(file) ? await this.readXlsx(file.body) : await this.readCsv(file.body)
    if (rows.length > maximumRows) throw new ValidationError('Invalid import file.', { file: 'Import no more than 500 entity records at a time.' })
    const availableCategories = new Set((await this.categories.list()).map((category) => category.code))
    const names = new Set<string>()

    for (const row of rows) {
      const nameKey = normalizedName(row.values['Entity Name'])
      if (nameKey && names.has(nameKey)) {
        row.status = 'duplicate'
        row.errors.name = 'Duplicate Entity Name in the uploaded file.'
        continue
      }
      if (nameKey) names.add(nameKey)
      this.validateRow(row, availableCategories)
      if (row.status !== 'invalid' && nameKey) {
        const existing = await this.establishments.findByName(normalizeWhitespace(row.values['Entity Name']))
        if (existing) {
          row.status = 'duplicate'
          row.errors.name = 'An entity with this name already exists in the registry.'
        }
      }
    }

    const id = randomUUID()
    const preview = summarize(id, rows)
    this.previews.set(id, { ...preview, createdAt: Date.now() })
    return preview
  }

  async confirm(id: string): Promise<BulkImportSummary> {
    const preview = this.getPreview(id)
    const summary: BulkImportSummary = { imported: [], skippedDuplicates: [], rejected: [] }
    for (const row of preview.rows) {
      if (row.status === 'duplicate') {
        summary.skippedDuplicates.push({ rowNumber: row.rowNumber, name: row.values['Entity Name'], message: Object.values(row.errors).join(' ') })
        continue
      }
      if (row.status === 'invalid') {
        summary.rejected.push({ rowNumber: row.rowNumber, name: row.values['Entity Name'], errors: row.errors })
        continue
      }
      try {
        const saved = await this.administratorEstablishments.create(inputFromRow(row))
        summary.imported.push({ rowNumber: row.rowNumber, id: saved.id, name: saved.name })
      } catch (error) {
        if (error instanceof ConflictError) {
          summary.skippedDuplicates.push({ rowNumber: row.rowNumber, name: row.values['Entity Name'], message: 'An entity with this name was created or already existed before import confirmation.' })
        } else if (error instanceof ValidationError) {
          summary.rejected.push({ rowNumber: row.rowNumber, name: row.values['Entity Name'], errors: error.details ?? { row: error.message } })
        } else if (error instanceof DatabaseUnavailableError) {
          throw error
        } else {
          summary.rejected.push({ rowNumber: row.rowNumber, name: row.values['Entity Name'], errors: { row: 'This row could not be imported.' } })
        }
      }
    }
    this.previews.delete(id)
    return summary
  }

  errorReport(id: string): Buffer {
    const preview = this.getPreview(id)
    const records = preview.rows.filter((row) => row.status !== 'valid')
    const header = ['Row', 'Entity Name', 'Status', 'Errors']
    const rows = records.map((row) => [String(row.rowNumber), row.values['Entity Name'], row.status, Object.entries(row.errors).map(([field, error]) => `${field}: ${error}`).join(' | ')])
    return Buffer.from([header, ...rows].map((record) => record.map(safeCsvCell).join(',')).join('\r\n'), 'utf8')
  }

  private async readXlsx(body: Buffer) {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(body as never, { ignoreNodes: ['dataValidations', 'extLst'] })
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new ValidationError('Invalid import file.', { file: 'The workbook must include an Entities worksheet.' })
      const headers = this.resolveHeaders(worksheet.getRow(1).values as ExcelJS.CellValue[])
      const rows: BulkImportRow[] = []
      worksheet.eachRow((sheetRow, number) => {
        if (number <= 1 || sheetRow.actualCellCount === 0) return
        const values = emptyValues()
        const errors: Record<string, string> = {}
        let hasValue = false
        for (const [column, index] of headers) {
          const value = sheetRow.getCell(index).value
          if (typeof value === 'object' && value !== null && 'formula' in value) {
            values[column] = ''
            errors[column] = 'Spreadsheet formulas are not supported. Enter a literal value.'
            hasValue = true
          } else {
            values[column] = textValue(value)
            hasValue ||= Boolean(values[column])
          }
        }
        if (hasValue) rows.push({ rowNumber: number, values, status: 'valid', errors })
      })
      return rows
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new ValidationError('Invalid import file.', { file: 'The Excel workbook could not be read.' })
    }
  }

  private async readCsv(body: Buffer) {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.csv.read(Readable.from(body))
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new ValidationError('Invalid import file.', { file: 'The CSV file could not be read.' })
      const headers = this.resolveHeaders(worksheet.getRow(1).values as ExcelJS.CellValue[])
      const rows: BulkImportRow[] = []
      worksheet.eachRow((sheetRow, number) => {
        if (number <= 1 || sheetRow.actualCellCount === 0) return
        const values = emptyValues()
        let hasValue = false
        for (const [column, index] of headers) {
          values[column] = textValue(sheetRow.getCell(index).value)
          hasValue ||= Boolean(values[column])
        }
        if (hasValue) rows.push({ rowNumber: number, values, status: 'valid', errors: {} })
      })
      return rows
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new ValidationError('Invalid import file.', { file: 'The CSV file could not be read.' })
    }
  }

  private resolveHeaders(cells: ExcelJS.CellValue[]) {
    const headers = new Map<ImportColumn, number>()
    const unexpected: string[] = []
    const duplicates: string[] = []
    cells.forEach((value, index) => {
      const header = textValue(value)
      if (!header) return
      const column = headerAliases[canonicalHeader(header)]
      if (!column) {
        unexpected.push(header)
        return
      }
      if (headers.has(column)) {
        duplicates.push(header)
        return
      }
      headers.set(column, index)
    })
    const missing = ['Entity Name', 'Category'].filter((column) => !headers.has(column as ImportColumn))
    if (unexpected.length || duplicates.length) {
      const issues = [
        unexpected.length ? `Unexpected column${unexpected.length > 1 ? 's' : ''}: ${unexpected.join(', ')}` : '',
        duplicates.length ? `Duplicate column${duplicates.length > 1 ? 's' : ''}: ${duplicates.join(', ')}` : '',
      ].filter(Boolean)
      throw new ValidationError('Invalid import file.', { columns: `${issues.join('. ')}.` })
    }
    if (missing.length) throw new ValidationError('Invalid import file.', { columns: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` })
    return headers
  }

  private validateRow(row: BulkImportRow, categories: Set<string>) {
    const category = normalizeWhitespace(row.values.Category).toLocaleUpperCase()
    if (!supportedCategories.has(category) || !categories.has(category)) row.errors.category = 'Use one of the configured category codes: SOE, JVC, or OSE.'
    try {
      validateEstablishmentInput(inputFromRow(row))
    } catch (error) {
      if (error instanceof ValidationError) Object.assign(row.errors, error.details)
      else row.errors.row = 'The row could not be validated.'
    }
    row.status = Object.keys(row.errors).length ? 'invalid' : 'valid'
  }

  private getPreview(id: string) {
    this.pruneExpiredPreviews()
    const preview = this.previews.get(id)
    if (!preview) throw new NotFoundError('This import preview is unavailable. Upload the file again.')
    return preview
  }

  private pruneExpiredPreviews() {
    const now = Date.now()
    for (const [id, preview] of this.previews) {
      if (now - preview.createdAt > previewLifetimeMs) this.previews.delete(id)
    }
  }
}
