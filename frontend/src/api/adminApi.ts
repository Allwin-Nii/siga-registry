import { publicApiBaseUrl } from './publicApi'

export type AdministratorIdentity = {
  id: number
  email: string
}

export type AdministratorSession = {
  administrator: AdministratorIdentity
  expiresAt: string
}

export type AdministratorCategory = {
  id: number
  code: string
  name: string
  description: string
}

export type AdministratorWorkflowStatus = 'draft' | 'pending_review' | 'published' | 'changes_requested' | 'rejected'

export type AdministratorEstablishment = {
  id: number
  slug: string
  name: string
  website: string | null
  email: string | null
  contactNumber: string | null
  summary: string
  category: AdministratorCategory
  workflowStatus: AdministratorWorkflowStatus
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
  reviewFeedback: string | null
}

export type AdministratorEstablishmentInput = {
  name: string
  website: string
  categoryId: string
  email: string
  contactNumber: string
  summary: string
}

export type AdministratorCategoryInput = {
  code: string
  name: string
  description: string
}

export type AdministratorPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type AdministratorEstablishmentPage = {
  data: AdministratorEstablishment[]
  meta: AdministratorPagination
}

export type AdministratorApiRequestOptions = {
  signal?: AbortSignal
}

type ErrorEnvelope = {
  error?: {
    code?: string
    message?: string
    details?: Record<string, string>
  }
}

type DataEnvelope<T> = { data: T }
type PageEnvelope<T> = DataEnvelope<T[]> & { meta: AdministratorPagination }

export class AdministratorApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly details: Record<string, string> | undefined

  constructor(message: string, status?: number, code?: string, details?: Record<string, string>) {
    super(message)
    this.name = 'AdministratorApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const requestTimeoutMs = 10_000
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

const apiErrorFrom = (response: Response, body: unknown) => {
  const error = isRecord(body) ? body as ErrorEnvelope : undefined
  return new AdministratorApiError(
    error?.error?.message || `The administrator request could not be completed (HTTP ${response.status}).`,
    response.status,
    error?.error?.code,
    error?.error?.details,
  )
}

const request = async <T>(
  path: string,
  init: RequestInit = {},
  options: AdministratorApiRequestOptions = {},
): Promise<T> => {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(`${publicApiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...init.headers },
      signal: controller.signal,
    })
    const body = await readJson(response)
    if (!response.ok) throw apiErrorFrom(response, body)
    return body as T
  } catch (error) {
    if (error instanceof AdministratorApiError) throw error
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new AdministratorApiError('The administrator request timed out. Please try again.')
    }
    throw new AdministratorApiError('Unable to reach the administrator service. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

const requireData = <T>(body: unknown): T => {
  if (isRecord(body) && 'data' in body) return (body as DataEnvelope<T>).data
  throw new AdministratorApiError('The administrator service returned an unexpected response.')
}

const mutation = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, csrfToken: string, body?: unknown) => {
  if (!csrfToken) {
    return Promise.reject(new AdministratorApiError('Your administrator security token is unavailable. Please sign in again.', 403, 'FORBIDDEN'))
  }
  return request<T>(path, {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

export const readCsrfToken = () => {
  const prefix = 'siga_admin_csrf='
  const cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix))
  if (!cookie) return undefined
  try {
    return decodeURIComponent(cookie.slice(prefix.length))
  } catch {
    return undefined
  }
}

export const loginAdministrator = async (email: string, password: string): Promise<AdministratorSession> =>
  requireData<AdministratorSession>(await request<DataEnvelope<AdministratorSession>>('/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }))

export const getAdministratorSession = async (options?: AdministratorApiRequestOptions): Promise<AdministratorSession> =>
  requireData<AdministratorSession>(await request<DataEnvelope<AdministratorSession>>('/admin/auth/session', {}, options))

export const logoutAdministrator = async (csrfToken: string) => {
  await mutation<undefined>('POST', '/admin/auth/logout', csrfToken)
}

export const listAdministratorEstablishments = async (
  query: { page?: number; pageSize?: number; status?: AdministratorWorkflowStatus } = {},
  options?: AdministratorApiRequestOptions,
): Promise<AdministratorEstablishmentPage> => {
  const parameters = new URLSearchParams()
  if (query.page) parameters.set('page', String(query.page))
  if (query.pageSize) parameters.set('pageSize', String(query.pageSize))
  if (query.status) parameters.set('status', query.status)
  const suffix = parameters.size ? `?${parameters.toString()}` : ''
  const body = await request<PageEnvelope<AdministratorEstablishment>>(`/admin/establishments${suffix}`, {}, options)
  if (!isRecord(body) || !('data' in body) || !('meta' in body)) {
    throw new AdministratorApiError('The administrator service returned an unexpected response.')
  }
  return { data: body.data, meta: body.meta }
}

export const createAdministratorEstablishment = async (
  input: AdministratorEstablishmentInput,
  csrfToken: string,
): Promise<AdministratorEstablishment> =>
  requireData<AdministratorEstablishment>(await mutation<DataEnvelope<AdministratorEstablishment>>('POST', '/admin/establishments', csrfToken, input))

export const updateAdministratorEstablishment = async (
  id: number,
  input: AdministratorEstablishmentInput,
  csrfToken: string,
): Promise<AdministratorEstablishment> =>
  requireData<AdministratorEstablishment>(await mutation<DataEnvelope<AdministratorEstablishment>>('PATCH', `/admin/establishments/${id}`, csrfToken, input))

export const setAdministratorPublication = async (
  id: number,
  published: boolean,
  csrfToken: string,
): Promise<AdministratorEstablishment> =>
  requireData<AdministratorEstablishment>(await mutation<DataEnvelope<AdministratorEstablishment>>('PATCH', `/admin/establishments/${id}/publication`, csrfToken, { published }))

export const deleteAdministratorEstablishment = async (id: number, csrfToken: string) => {
  await mutation<undefined>('DELETE', `/admin/establishments/${id}`, csrfToken)
}

export const listAdministratorCategories = async (options?: AdministratorApiRequestOptions): Promise<AdministratorCategory[]> =>
  requireData<AdministratorCategory[]>(await request<DataEnvelope<AdministratorCategory[]>>('/admin/categories', {}, options))

export const createAdministratorCategory = async (
  input: AdministratorCategoryInput,
  csrfToken: string,
): Promise<AdministratorCategory> =>
  requireData<AdministratorCategory>(await mutation<DataEnvelope<AdministratorCategory>>('POST', '/admin/categories', csrfToken, input))

export const updateAdministratorCategory = async (
  id: number,
  input: AdministratorCategoryInput,
  csrfToken: string,
): Promise<AdministratorCategory> =>
  requireData<AdministratorCategory>(await mutation<DataEnvelope<AdministratorCategory>>('PATCH', `/admin/categories/${id}`, csrfToken, input))

export const deleteAdministratorCategory = async (id: number, csrfToken: string) => {
  await mutation<undefined>('DELETE', `/admin/categories/${id}`, csrfToken)
}
