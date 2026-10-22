import { ValidationError } from '../lib/errors.js'
import type { EstablishmentInput, ValidatedEstablishmentInput } from '../types/establishment.js'

const optionalText = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' ? value.trim() : null
}

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const asText = (value: unknown) => typeof value === 'string' ? value : ''

export const validateEstablishmentInput = (input: Partial<EstablishmentInput>): ValidatedEstablishmentInput => {
  const name = normalizeWhitespace(asText(input.name))
  const categoryCode = normalizeWhitespace(asText(input.categoryId)).toUpperCase()
  const website = optionalText(input.website)
  const email = optionalText(input.email)
  const contactNumber = optionalText(input.contactNumber)
  const summary = normalizeWhitespace(asText(input.summary))
  const errors: Record<string, string> = {}

  if (name.length < 3 || name.length > 120) errors.name = 'Enter a name between 3 and 120 characters.'
  if (!/^[A-Z]{3}$/.test(categoryCode)) errors.categoryId = 'Choose a valid category.'
  if (website && (website.length > 2048 || !validHttpUrl(website))) {
    errors.website = 'Enter a valid HTTP or HTTPS website URL of at most 2048 characters.'
  }
  if (email && (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))) {
    errors.email = 'Enter a valid email address of at most 254 characters.'
  }
  if (contactNumber && (contactNumber.length < 5 || contactNumber.length > 32 || !/^[0-9+().\-\s]+$/.test(contactNumber))) {
    errors.contactNumber = 'Enter a contact number between 5 and 32 characters.'
  }
  if (summary.length < 20 || summary.length > 500) {
    errors.summary = 'Enter a brief description between 20 and 500 characters.'
  }

  if (Object.keys(errors).length > 0) throw new ValidationError('Invalid establishment input.', errors)

  return { name, categoryCode, website, email, contactNumber, summary }
}

export const slugFromName = (name: string) => {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) throw new ValidationError('The name must include letters or numbers that can form a URL slug.', { name: 'Use letters or numbers in the name.' })
  return slug.slice(0, 160).replace(/-+$/g, '')
}
