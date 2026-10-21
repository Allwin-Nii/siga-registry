import { isCategoryId } from '../data/mockData'
import type {
  Category,
  Establishment,
  EstablishmentFormInput,
  EstablishmentInput,
  EstablishmentValidationErrors,
} from '../types'

export type EstablishmentValidationOptions = {
  categories: readonly Category[]
  existingEstablishments: readonly Establishment[]
  excludeEstablishmentId?: string
}

export const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const normalizeName = (value: string) => normalizeWhitespace(value).toLocaleLowerCase()

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const toEstablishmentInput = (input: EstablishmentFormInput): EstablishmentInput => ({
  name: normalizeWhitespace(input.name),
  categoryId: input.categoryId,
  email: input.email.trim(),
  contactNumber: input.contactNumber.trim(),
  website: input.website.trim(),
  summary: normalizeWhitespace(input.summary),
})

export const toEstablishmentFormInput = (establishment: Establishment): EstablishmentFormInput => ({
  name: establishment.name,
  categoryId: establishment.categoryId,
  email: establishment.email,
  contactNumber: establishment.contactNumber,
  website: establishment.website,
  summary: establishment.summary,
})

export function validateEstablishmentInput(
  input: EstablishmentInput,
  { categories, existingEstablishments, excludeEstablishmentId }: EstablishmentValidationOptions,
): EstablishmentValidationErrors {
  const errors: EstablishmentValidationErrors = {}
  const name = normalizeWhitespace(input.name)
  const email = input.email.trim()
  const summary = normalizeWhitespace(input.summary)
  const contactNumber = input.contactNumber.trim()
  const website = input.website.trim()

  if (name.length < 3 || name.length > 120) errors.name = 'Enter a name between 3 and 120 characters.'
  if (!isCategoryId(input.categoryId, categories)) errors.categoryId = 'Choose SOE, JVC, or OSE.'
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (website && !isValidHttpUrl(website)) errors.website = 'Enter a valid HTTP or HTTPS website URL.'
  if (contactNumber && (contactNumber.length < 5 || contactNumber.length > 32 || !/^[0-9+().\-\s]+$/.test(contactNumber))) {
    errors.contactNumber = 'Enter a contact number between 5 and 32 characters.'
  }
  if (summary.length < 20 || summary.length > 500) {
    errors.summary = 'Enter a brief description between 20 and 500 characters.'
  }

  const duplicateName = existingEstablishments.some((establishment) =>
    establishment.id !== excludeEstablishmentId && normalizeName(establishment.name) === normalizeName(name),
  )
  if (name && duplicateName) errors.name = 'An establishment with this name already exists in the prototype registry.'

  return errors
}
