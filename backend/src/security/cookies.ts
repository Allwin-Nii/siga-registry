export type SessionCookieSettings = {
  secure: boolean
  sessionTtlSeconds: number
}

export const sessionCookieName = 'siga_admin_session'
export const csrfCookieName = 'siga_admin_csrf'

const cookieAttributes = (path: string, secure: boolean) => [
  `Path=${path}`,
  'SameSite=Strict',
  ...(secure ? ['Secure'] : []),
]

const encode = (value: string) => encodeURIComponent(value)

export const createSessionCookies = (sessionToken: string, csrfToken: string, settings: SessionCookieSettings) => [
  `${sessionCookieName}=${encode(sessionToken)}; HttpOnly; Max-Age=${settings.sessionTtlSeconds}; ${cookieAttributes('/api', settings.secure).join('; ')}`,
  `${csrfCookieName}=${encode(csrfToken)}; Max-Age=${settings.sessionTtlSeconds}; ${cookieAttributes('/', settings.secure).join('; ')}`,
]

export const clearSessionCookies = (settings: Pick<SessionCookieSettings, 'secure'>) => [
  `${sessionCookieName}=; HttpOnly; Max-Age=0; ${cookieAttributes('/api', settings.secure).join('; ')}`,
  `${csrfCookieName}=; Max-Age=0; ${cookieAttributes('/', settings.secure).join('; ')}`,
]

export const readCookies = (header: string | undefined) => {
  const cookies = new Map<string, string>()
  if (!header) return cookies
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 1) continue
    const name = part.slice(0, separator).trim()
    const encodedValue = part.slice(separator + 1).trim()
    try {
      cookies.set(name, decodeURIComponent(encodedValue))
    } catch {
      // Ignore malformed cookie values.
    }
  }
  return cookies
}
