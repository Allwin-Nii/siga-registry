import { publicApiBaseUrl } from './publicApi'

export type PublicUserIdentity = { id: number; email: string }
export type PublicUserSession = { publicUser: PublicUserIdentity; expiresAt: string }

type ErrorEnvelope = { error?: { code?: string; message?: string; details?: Record<string, string> } }
type DataEnvelope<T> = { data: T }

export class PublicAuthApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly details: Record<string, string> | undefined

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, string>,
  ) {
    super(message)
    this.name = 'PublicAuthApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${publicApiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init.headers },
  })
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  if (!response.ok) {
    const error = isRecord(body) ? body as ErrorEnvelope : undefined
    throw new PublicAuthApiError(error?.error?.message || `The public account request could not be completed (HTTP ${response.status}).`, response.status, error?.error?.code, error?.error?.details)
  }
  return body as T
}

const requireData = <T>(body: unknown): T => {
  if (isRecord(body) && 'data' in body) return (body as DataEnvelope<T>).data
  throw new PublicAuthApiError('The public account service returned an unexpected response.')
}

const credentialsBody = (email: string, password: string) => ({ email, password })

export const registerPublicUser = async (email: string, password: string): Promise<PublicUserSession> =>
  requireData<PublicUserSession>(await request<DataEnvelope<PublicUserSession>>('/public/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentialsBody(email, password)),
  }))

export const loginPublicUser = async (email: string, password: string): Promise<PublicUserSession> =>
  requireData<PublicUserSession>(await request<DataEnvelope<PublicUserSession>>('/public/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentialsBody(email, password)),
  }))

export const getPublicUserSession = async (): Promise<PublicUserSession> =>
  requireData<PublicUserSession>(await request<DataEnvelope<PublicUserSession>>('/public/auth/session'))

export const readPublicCsrfToken = () => {
  const prefix = 'siga_public_csrf='
  const value = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix))
  if (!value) return undefined
  try {
    return decodeURIComponent(value.slice(prefix.length))
  } catch {
    return undefined
  }
}

export const logoutPublicUser = async (csrfToken: string) => {
  if (!csrfToken) throw new PublicAuthApiError('Your public account security token is unavailable. Please sign in again.', 403, 'FORBIDDEN')
  await request('/public/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } })
}
