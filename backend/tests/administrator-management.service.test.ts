import { describe, expect, it, vi } from 'vitest'
import type { DatabaseTransaction, TransactionRunner } from '../src/config/database.js'
import { ConflictError, ValidationError } from '../src/lib/errors.js'
import type { CategoryManagerRepository } from '../src/repositories/category.repository.js'
import type { EstablishmentManagerRepository } from '../src/repositories/establishment.repository.js'
import { AdministratorCategoryService } from '../src/services/administrator-category.service.js'
import { AdministratorEstablishmentService } from '../src/services/administrator-establishment.service.js'
import type { EstablishmentRecord, RegistryCategory } from '../src/types/establishment.js'

const category: RegistryCategory = { id: 1, code: 'SOE', name: 'SOE', description: 'State-Owned Enterprise' }
const existing: EstablishmentRecord = {
  id: 1,
  slug: 'existing-entity',
  name: 'Existing Entity',
  website: 'https://existing.test/',
  email: 'info@existing.test',
  contactNumber: '+233 302 000 000',
  summary: 'An existing establishment with a sufficiently detailed description.',
  latitude: 5.6037,
  longitude: -0.187,
  category,
  workflowStatus: 'published',
  createdAt: new Date(),
  updatedAt: new Date(),
  submittedAt: null,
  reviewedAt: null,
  reviewFeedback: null,
}

const input = {
  name: 'New Entity', categoryId: 'soe', website: 'https://new.test/', email: 'info@new.test',
  contactNumber: '+233 302 000 001', summary: 'A newly administered establishment with a valid description.',
}

const transaction = {} as DatabaseTransaction
const transactions: TransactionRunner = { runInTransaction: async (work) => work(transaction) }

const establishmentRepository = () => ({
  findPublishedDirectory: vi.fn(),
  findPublishedBySlug: vi.fn(),
  findById: vi.fn(async () => existing),
  findByName: vi.fn(async () => undefined),
  findBySlug: vi.fn(async () => undefined),
  createDraft: vi.fn(async (draft) => ({ ...existing, id: 2, name: draft.name, slug: draft.slug, workflowStatus: 'draft' as const })),
  updateEditableRecord: vi.fn(async () => existing),
  replaceManagement: vi.fn(async () => undefined),
  setPublicationStatus: vi.fn(async (id, published) => ({ ...existing, id, workflowStatus: published ? 'published' as const : 'draft' as const })),
  deleteById: vi.fn(async () => true),
  listInternalRecords: vi.fn(async () => ({ data: [existing], page: 1, pageSize: 20, total: 1, totalPages: 1 })),
} satisfies EstablishmentManagerRepository)

const categoryRepository = (references = 0) => ({
  list: vi.fn(async () => [category]),
  findByCode: vi.fn(async (code) => code === 'SOE' ? category : undefined),
  findById: vi.fn(async () => category),
  create: vi.fn(async () => category),
  update: vi.fn(async () => category),
  countEstablishmentReferences: vi.fn(async () => references),
  deleteById: vi.fn(async () => true),
} satisfies CategoryManagerRepository)

describe('direct administrator management services', () => {
  it('creates, updates, publishes, unpublishes, and deletes records without review transitions', async () => {
    const establishments = establishmentRepository()
    const categories = categoryRepository()
    const service = new AdministratorEstablishmentService(establishments, categories, transactions)

    await expect(service.create({ ...input, published: true })).resolves.toMatchObject({ id: 2, workflowStatus: 'published' })
    expect(establishments.createDraft).toHaveBeenCalledWith(expect.objectContaining({ categoryDatabaseId: 1, slug: 'new-entity' }), transaction)
    expect(establishments.setPublicationStatus).toHaveBeenCalledWith(2, true, transaction)

    await expect(service.update(1, { ...input, published: false })).resolves.toMatchObject({ workflowStatus: 'draft' })
    await expect(service.setPublication(1, true)).resolves.toMatchObject({ workflowStatus: 'published' })
    await expect(service.delete(1)).resolves.toBeUndefined()
    expect(establishments.deleteById).toHaveBeenCalledWith(1, transaction)
  })

  it('validates all six establishment fields and does not allow unknown categories', async () => {
    const establishments = establishmentRepository()
    const categories = categoryRepository()
    const service = new AdministratorEstablishmentService(establishments, categories, transactions)

    await expect(service.create({ ...input, summary: 'short' })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, categoryId: 'bad' })).rejects.toBeInstanceOf(ValidationError)
    expect(establishments.createDraft).not.toHaveBeenCalled()
  })

  it('validates secure profile details and replaces management members atomically with an entity update', async () => {
    const establishments = establishmentRepository()
    const categories = categoryRepository()
    const service = new AdministratorEstablishmentService(establishments, categories, transactions)

    await expect(service.create({ ...input, logoUrl: 'http://images.example.test/logo.png' })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, gpsAddress: 'not-a-gps-address' })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, latitude: 91, longitude: 0 })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, latitude: 5.6, longitude: null })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, gpsLocationUrl: 'javascript:alert(1)' })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, gpsLocationUrl: 'https://maps.app.goo.gl/short-link' })).rejects.toBeInstanceOf(ValidationError)
    await expect(service.create({ ...input, gpsLocationUrl: 'https://www.example.test/maps/place/entity' })).rejects.toBeInstanceOf(ValidationError)

    await expect(service.create({
      ...input,
      gpsLocationUrl: 'https://www.google.com/maps/place/Ghana+Cocoa+Board',
    })).resolves.toBeDefined()

    await service.update(1, {
      ...input,
      logoUrl: 'https://images.example.test/logo.png',
      region: 'Greater Accra',
      city: 'Accra',
      gpsAddress: 'GA-123-4567',
      gpsLocationUrl: 'https://maps.google.com/?q=5.6037,-0.1870',
      latitude: 5.6037,
      longitude: -0.187,
      management: [{ fullName: 'Ama Mensah', position: 'Managing Director', officialEmail: '', officialPhone: '' }],
    })

    expect(establishments.replaceManagement).toHaveBeenCalledWith(1, [{
      fullName: 'Ama Mensah', position: 'Managing Director', officialEmail: null, officialPhone: null, displayOrder: 0,
    }], transaction)
  })

  it('keeps stored coordinates when the administrator form omits them', async () => {
    const establishments = establishmentRepository()
    const categories = categoryRepository()
    const service = new AdministratorEstablishmentService(establishments, categories, transactions)

    await service.update(1, { ...input, gpsLocationUrl: 'https://www.google.com/maps/place/Existing+Entity' })

    expect(establishments.updateEditableRecord).toHaveBeenCalledWith(1, expect.objectContaining({
      latitude: 5.6037,
      longitude: -0.187,
    }), transaction)
  })

  it('allows category CRUD but blocks deletion while an establishment references the category', async () => {
    const referenced = categoryRepository(1)
    const referencedService = new AdministratorCategoryService(referenced, transactions)
    await expect(referencedService.delete(1)).rejects.toBeInstanceOf(ConflictError)
    expect(referenced.deleteById).not.toHaveBeenCalled()

    const unreferenced = categoryRepository(0)
    const service = new AdministratorCategoryService(unreferenced, transactions)
    await expect(service.create({ code: 'NEW', name: 'New', description: 'New category' })).resolves.toEqual(category)
    await expect(service.update(1, { code: 'SOE', name: 'SOE', description: 'Updated description' })).resolves.toEqual(category)
    await expect(service.delete(1)).resolves.toBeUndefined()
    expect(unreferenced.deleteById).toHaveBeenCalledWith(1, transaction)
  })
})
