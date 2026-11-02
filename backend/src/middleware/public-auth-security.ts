import type { RequestHandler } from 'express'
import { AuthenticationError, ForbiddenError } from '../lib/errors.js'
import type { PublicAuthenticationService } from '../services/public-auth.service.js'
import { readCookies } from '../security/cookies.js'
import { publicCsrfCookieName, publicSessionCookieName } from '../security/public-cookies.js'
import { hashSecret, secretsMatch } from '../security/credentials.js'

export const createRequirePublicUser = (authentication: PublicAuthenticationService): RequestHandler =>
  async (request, _response, next) => {
    try {
      const session = await authentication.getAuthenticatedSession(readCookies(request.headers.cookie).get(publicSessionCookieName))
      if (!session) throw new AuthenticationError()
      request.publicUserSession = session
      next()
    } catch (error) {
      next(error)
    }
  }

export const createPublicOriginProtection = (allowedOrigin: string): RequestHandler =>
  (request, _response, next) => {
    if (request.get('origin') !== allowedOrigin) {
      next(new ForbiddenError('This request origin is not allowed.'))
      return
    }
    next()
  }

export const requirePublicCsrfProtection: RequestHandler = (request, _response, next) => {
  const session = request.publicUserSession
  const csrfCookie = readCookies(request.headers.cookie).get(publicCsrfCookieName)
  const csrfHeader = request.get('x-csrf-token')
  if (!session || !csrfCookie || !csrfHeader || !secretsMatch(csrfCookie, csrfHeader) || !secretsMatch(hashSecret(csrfHeader), session.csrfTokenHash)) {
    next(new ForbiddenError('A valid CSRF token is required.'))
    return
  }
  next()
}
