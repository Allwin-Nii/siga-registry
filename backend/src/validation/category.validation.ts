import { ValidationError } from '../lib/errors.js'
import { normalizeWhitespace } from './establishment.validation.js'

export type CategoryInput = {
  code: string
  name: string
  description: string
}

export const validateCategoryInput = (input: Partial<CategoryInput>): CategoryInput => {
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : ''
  const name = typeof input.name === 'string' ? normalizeWhitespace(input.name) : ''
  const description = typeof input.description === 'string' ? normalizeWhitespace(input.description) : ''
  const errors: Record<string, string> = {}

  if (!/^[A-Z0-9]{3}$/.test(code)) errors.code = 'Use a unique three-character category code.'
  if (name.length < 2 || name.length > 100) errors.name = 'Enter a name between 2 and 100 characters.'
  if (description.length < 3 || description.length > 255) errors.description = 'Enter a description between 3 and 255 characters.'
  if (Object.keys(errors).length > 0) throw new ValidationError('Invalid category input.', errors)
  return { code, name, description }
}
