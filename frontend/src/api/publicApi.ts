export type PublicCategory = {
  id: string
  code: string
  name: string
  description: string
}

export type PublicManagementMember = {
  id: number
  fullName: string
  position: string
  officialEmail: string | null
  officialPhone: string | null
  displayOrder: number
}

export type PublicEstablishment = {
  id: string
  slug: string
  name: string
  website: string
  logoUrl?: string
  categoryId: string
  category: PublicCategory
  email: string
  contactNumber: string
  summary: string
  region?: string
  city?: string
  physicalAddress?: string
  gpsAddress?: string
  gpsLocationUrl?: string
  latitude?: number | null
  longitude?: number | null
  management?: PublicManagementMember[]
}

export type DirectoryMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PublicDirectory = {
  data: PublicEstablishment[]
  meta: DirectoryMeta
}

export type DirectoryRequest = {
  search?: string
  category?: string
  page?: number
  pageSize?: number
}

export type PublicApiRequestOptions = {
  signal?: AbortSignal
}

type ApiErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

type ApiDataEnvelope<T> = {
  data: T
}

type ApiDirectoryEnvelope = ApiDataEnvelope<PublicEstablishment[]> & {
  meta: DirectoryMeta
}

export type PublicApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response'

export class PublicApiError extends Error {
  readonly kind: PublicApiErrorKind
  readonly status: number | undefined
  readonly code: string | undefined

  constructor(
    message: string,
    kind: PublicApiErrorKind,
    status?: number,
    code?: string,
  ) {
    super(message)
    this.name = 'PublicApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

const defaultApiBaseUrl = 'http://localhost:3001/api'
const requestTimeoutMs = 10_000
const configuredApiBaseUrl = import.meta.env.VITE_PUBLIC_API_BASE_URL?.trim()

export const publicApiBaseUrl = (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/+$/, '')

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

const request = async <T>(path: string, options: PublicApiRequestOptions = {}): Promise<T> => {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(`${publicApiBaseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
    })
    const body = await readJson(response)

    if (!response.ok) {
      const error = isRecord(body) ? body as ApiErrorEnvelope : undefined
      const message = error?.error?.message || `The registry request could not be completed (HTTP ${response.status}).`
      throw new PublicApiError(message, 'http', response.status, error?.error?.code)
    }

    return body as T
  } catch (error) {
    if (error instanceof PublicApiError) throw error
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new PublicApiError('The registry request timed out. Please try again.', 'timeout')
    }
    throw new PublicApiError('Unable to reach the registry service. Check your connection and try again.', 'network')
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

const requireData = <T>(body: unknown): T => {
  if (isRecord(body) && 'data' in body) return (body as ApiDataEnvelope<T>).data
  throw new PublicApiError('The registry service returned an unexpected response.', 'invalid-response')
}

export const getPublicCategories = async (options?: PublicApiRequestOptions): Promise<PublicCategory[]> =>
  requireData<PublicCategory[]>(await request<ApiDataEnvelope<PublicCategory[]>>('/categories', options))

export const getPublicDirectory = async (
  directory: DirectoryRequest = {},
  options?: PublicApiRequestOptions,
): Promise<PublicDirectory> => {
  const parameters = new URLSearchParams()
  if (directory.search?.trim()) parameters.set('search', directory.search.trim())
  if (directory.category?.trim()) parameters.set('category', directory.category.trim())
  if (directory.page) parameters.set('page', String(directory.page))
  if (directory.pageSize) parameters.set('pageSize', String(directory.pageSize))
  const query = parameters.size > 0 ? `?${parameters.toString()}` : ''
  const body = await request<ApiDirectoryEnvelope>(`/establishments${query}`, options)

  if (!isRecord(body) || !('data' in body) || !('meta' in body)) {
    throw new PublicApiError('The registry service returned an unexpected response.', 'invalid-response')
  }
  return { data: body.data, meta: body.meta }
}

export const getPublicEstablishment = async (
  slug: string,
  options?: PublicApiRequestOptions,
): Promise<PublicEstablishment> =>
  requireData<PublicEstablishment>(await request<ApiDataEnvelope<PublicEstablishment>>(`/establishments/${encodeURIComponent(slug)}`, options))
