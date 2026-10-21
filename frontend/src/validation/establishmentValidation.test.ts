import { describe, expect, it } from 'vitest'
import { categoryOptions, initialEstablishments } from '../data/mockData'
import type { EstablishmentInput } from '../types'
import { toEstablishmentFormInput, toEstablishmentInput, validateEstablishmentInput } from './establishmentValidation'

const validInput: EstablishmentInput = {
  name: 'Signal House',
  categoryId: 'soe',
  website: 'https://signal-house.example',
  email: 'contact@signal-house.example',
  contactNumber: '+000 000 0999',
  summary: 'A fictional sample establishment used to verify canonical registry validation behaviour.',
}

describe('establishment validation', () => {
  it('returns field-specific errors for invalid establishment fields and an unknown category', () => {
    const errors = validateEstablishmentInput({
      ...validInput,
      name: 'x',
      categoryId: 'unknown-category',
      email: 'not-an-email',
      contactNumber: 'x',
      website: 'ftp://example.test',
      summary: 'Too short',
    }, { categories: categoryOptions, existingEstablishments: initialEstablishments })

    expect(errors).toMatchObject({
      name: expect.any(String),
      categoryId: expect.any(String),
      email: expect.any(String),
      contactNumber: expect.any(String),
      website: expect.any(String),
      summary: expect.any(String),
    })
  })

  it('allows empty optional contact fields while still requiring a name, category, and brief description', () => {
    const errors = validateEstablishmentInput({ ...validInput, website: '', email: '', contactNumber: '' }, {
      categories: categoryOptions,
      existingEstablishments: initialEstablishments,
    })
    expect(errors).toEqual({})
  })

  it('rejects duplicate names case-insensitively but allows a record to retain its own name while editing', () => {
    const existing = initialEstablishments[0]
    const duplicate = validateEstablishmentInput({ ...validInput, name: `  ${existing.name.toUpperCase()}  ` }, {
      categories: categoryOptions,
      existingEstablishments: initialEstablishments,
    })
    const selfEdit = validateEstablishmentInput({
      ...toEstablishmentInput(toEstablishmentFormInput(existing)),
      website: 'https://aurelia-power.example',
    }, {
      categories: categoryOptions,
      existingEstablishments: initialEstablishments,
      excludeEstablishmentId: existing.id,
    })

    expect(duplicate.name).toBeTruthy()
    expect(selfEdit.name).toBeUndefined()
  })

  it('keeps one canonical summary property while normalising form input', () => {
    const formInput = toEstablishmentFormInput(initialEstablishments[0])
    expect(toEstablishmentInput({ ...formInput, summary: '  A  concise  brief description.  ' }).summary).toBe('A concise brief description.')
  })
})
