import { ValidationError } from '../lib/errors.js'
import type { DirectoryQuery } from '../types/establishment.js'

type QueryValue = unknown

const MAX_PAGE = 10_000
const MAX_PAGE_SIZE = 100

const oneValue = (value: QueryValue, field: string) => {
  if (Array.isArray(value)) throw new ValidationError('Invalid query parameters.', { [field]: 'Provide this parameter only once.' })
  if (value !== undefined && typeof value !== 'string') {
    throw new ValidationError('Invalid query parameters.', { [field]: 'Use a text value.' })
  }
  return value as string | undefined
}

const parsePositiveInteger = (value: string | undefined, field: string, fallback: number, maximum: number) => {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value)) {
    throw new ValidationError('Invalid query parameters.', { [field]: 'Use a whole number.' })
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ValidationError('Invalid query parameters.', { [field]: `Use a number between 1 and ${maximum}.` })
  }
  return parsed
}

export const parseDirectoryQuery = (query: Record<string, QueryValue>): DirectoryQuery => {
  const rawSearch = oneValue(query.search, 'search')
  const rawCategory = oneValue(query.category, 'category')
  const rawPage = oneValue(query.page, 'page')
  const rawPageSize = oneValue(query.pageSize, 'pageSize')
  const search = rawSearch?.trim()
  const categoryCode = rawCategory?.trim().toUpperCase()

  if (search && search.length > 120) {
    throw new ValidationError('Invalid query parameters.', { search: 'Use at most 120 characters.' })
  }
  if (categoryCode && !/^[A-Z]{3}$/.test(categoryCode)) {
    throw new ValidationError('Invalid query parameters.', { category: 'Use a configured three-letter category code.' })
  }

  return {
    ...(search ? { search } : {}),
    ...(categoryCode ? { categoryCode } : {}),
    page: parsePositiveInteger(rawPage, 'page', 1, MAX_PAGE),
    pageSize: parsePositiveInteger(rawPageSize, 'pageSize', 20, MAX_PAGE_SIZE),
  }
}

export const parseSlug = (slug: unknown) => {
  const normalized = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) || normalized.length > 160) {
    throw new ValidationError('Invalid establishment slug.', { slug: 'Use lowercase letters, numbers, and single hyphens.' })
  }
  return normalized
}
