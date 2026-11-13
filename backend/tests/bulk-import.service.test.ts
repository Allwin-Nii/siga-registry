import ExcelJS from 'exceljs'
import { describe, expect, it, vi } from 'vitest'
import { BulkImportService, type BulkImportFile } from '../src/services/bulk-import.service.js'
import { ConflictError } from '../src/lib/errors.js'

const categories = [{ id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }]
const validDescription = 'A sufficiently detailed description for bulk import validation.'
const importedDraftSummary = 'This entity was imported as a draft. Complete its profile before publication.'

const csvFile = (contents: string, filename = 'entities.csv'): BulkImportFile => ({
  filename,
  contentType: 'text/csv',
  body: Buffer.from(contents, 'utf8'),
})

const record = (id: number, name: string) => ({
  id, slug: name.toLocaleLowerCase().replaceAll(' ', '-'), name, website: null, email: null, contactNumber: null, summary: validDescription,
  category: categories[0]!, workflowStatus: 'draft' as const, createdAt: new Date(), updatedAt: new Date(), submittedAt: null, reviewedAt: null, reviewFeedback: null,
})

const createService = (existingNames: string[] = []) => {
  const existing = new Set(existingNames.map((name) => name.toLocaleLowerCase()))
  const create = vi.fn(async (input: { name?: unknown }) => {
    const name = String(input.name)
    if (existing.has(name.toLocaleLowerCase())) throw new ConflictError()
    existing.add(name.toLocaleLowerCase())
    return record(existing.size, name)
  })
  const findByName = vi.fn(async (name: string) => existing.has(name.toLocaleLowerCase()) ? record(1, name) : undefined)
  return {
    service: new BulkImportService({ findByName }, { list: vi.fn(async () => categories) }, { create }),
    create,
    findByName,
  }
}

describe('bulk entity import', () => {
  it('generates a blank Excel template with only the five entity headings and no example records', async () => {
    const { service } = createService()
    const template = await service.createTemplate()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(template as never)

    const entities = workbook.getWorksheet('Entities')
    const allCellValues: string[] = []
    workbook.eachSheet((worksheet) => worksheet.eachRow((row) => row.eachCell((cell) => allCellValues.push(String(cell.value ?? '')))));

    expect((entities?.getRow(1).values as string[]).slice(1)).toEqual([
      'Entity Name', 'Category', 'Website URL', 'Email Address', 'Contact Number',
    ])
    expect(entities?.actualRowCount).toBe(1)
    expect(entities?.getRow(2).actualCellCount).toBe(0)
    expect(entities?.getRow(1).font?.bold).toBe(true)
    expect(allCellValues.join('\n')).not.toMatch(/example state entity|example\.gov/i)
    expect(workbook.getWorksheet('Instructions')?.getCell('A2').value).toBe('Required fields')
    expect(workbook.getWorksheet('Instructions')?.getCell('B3').value).toContain('SOE, JVC, or OSE')
  })

  it('previews valid CSV rows without database writes and imports them as drafts on confirmation', async () => {
    const { service, create } = createService()
    const preview = await service.preview(csvFile('Entity Name,Category,Website URL,Email Address,Contact Number\nExample Import,SOE,https://example.gov.gh,info@example.gov.gh,+233 302 000 000'))

    expect(preview).toMatchObject({ total: 1, valid: 1, invalid: 0, duplicates: 0 })
    expect(create).not.toHaveBeenCalled()
    const summary = await service.confirm(preview.id)
    expect(summary.imported).toEqual([{ rowNumber: 2, id: 1, name: 'Example Import' }])
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Example Import', categoryId: 'SOE', summary: importedDraftSummary, management: [] }))
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('published')
  })

  it('parses a valid Excel workbook and preserves the source row number', async () => {
    const { service } = createService()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Entities')
    sheet.addRow(['Entity Name', 'Category', 'Website URL', 'Email Address', 'Contact Number'])
    sheet.addRow(['Excel Import', 'SOE', 'https://example.gov.gh', 'info@example.gov.gh', '+233 302 000 000'])
    const preview = await service.preview({ filename: 'entities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from(await workbook.xlsx.writeBuffer()) })

    expect(preview.rows[0]).toMatchObject({ rowNumber: 2, status: 'valid', values: { 'Entity Name': 'Excel Import', Category: 'SOE' } })
  })

  it('marks missing required fields, invalid categories, and duplicate names without silently dropping rows', async () => {
    const { service } = createService(['Existing Entity'])
    const preview = await service.preview(csvFile([
      'Entity Name,Category',
      ',SOE',
      'Invalid Category,BAD',
      'Duplicate Within File,SOE',
      'duplicate within file,SOE',
      'Existing Entity,SOE',
    ].join('\n')))

    expect(preview).toMatchObject({ total: 5, valid: 1, invalid: 2, duplicates: 2 })
    expect(preview.rows[0]?.errors.name).toContain('between 3 and 120')
    expect(preview.rows[1]?.errors.category).toContain('SOE')
    expect(preview.rows[3]?.status).toBe('duplicate')
    expect(preview.rows[4]?.status).toBe('duplicate')
  })

  it('requires the Entity Name and Category columns and rejects unexpected headers, malformed files, and oversized files', async () => {
    const { service } = createService()
    await expect(service.preview(csvFile('Website URL\nhttps://example.gov.gh'))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(service.preview(csvFile('Entity Name,Category,Brief Description\nTest,SOE,Unexpected'))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { columns: expect.stringContaining('Unexpected column: Brief Description') },
    })
    await expect(service.preview({ filename: 'entities.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from('not a workbook') })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(service.preview({ filename: 'entities.csv', contentType: 'text/csv', body: Buffer.alloc(5 * 1024 * 1024 + 1) })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('reports partial confirmation failures and escapes spreadsheet formula values in the error report', async () => {
    const { service, create } = createService()
    create.mockImplementationOnce(async () => record(1, 'First Entity')).mockImplementationOnce(async () => { throw new ConflictError() })
    const preview = await service.preview(csvFile([
      'Entity Name,Category',
      'First Entity,SOE',
      'Second Entity,SOE',
      '=Unsafe Name,BAD',
    ].join('\n')))
    const report = service.errorReport(preview.id).toString('utf8')
    const summary = await service.confirm(preview.id)

    expect(report).toContain("'=Unsafe Name")
    expect(summary.imported).toHaveLength(1)
    expect(summary.skippedDuplicates).toHaveLength(1)
    expect(summary.rejected).toHaveLength(1)
  })
})
