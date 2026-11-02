import type { SessionCookieSettings } from './cookies.js'

export const publicSessionCookieName = 'siga_public_session'
export const publicCsrfCookieName = 'siga_public_csrf'
const publicSessionPath = '/api'
const legacyPublicSessionPath = '/api/public/auth'

const attributes = (path: string, secure: boolean) => [
  `Path=${path}`,
  'SameSite=Strict',
  ...(secure ? ['Secure'] : []),
]

const encode = (value: string) => encodeURIComponent(value)

export const createPublicSessionCookies = (sessionToken: string, csrfToken: string, settings: SessionCookieSettings) => [
  `${publicSessionCookieName}=${encode(sessionToken)}; HttpOnly; Max-Age=${settings.sessionTtlSeconds}; ${attributes(publicSessionPath, settings.secure).join('; ')}`,
  `${publicCsrfCookieName}=${encode(csrfToken)}; Max-Age=${settings.sessionTtlSeconds}; ${attributes('/', settings.secure).join('; ')}`,
  `${publicSessionCookieName}=; HttpOnly; Max-Age=0; ${attributes(legacyPublicSessionPath, settings.secure).join('; ')}`,
]

export const clearPublicSessionCookies = (settings: Pick<SessionCookieSettings, 'secure'>) => [
  `${publicSessionCookieName}=; HttpOnly; Max-Age=0; ${attributes(publicSessionPath, settings.secure).join('; ')}`,
  `${publicSessionCookieName}=; HttpOnly; Max-Age=0; ${attributes(legacyPublicSessionPath, settings.secure).join('; ')}`,
  `${publicCsrfCookieName}=; Max-Age=0; ${attributes('/', settings.secure).join('; ')}`,
]
