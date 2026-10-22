import type { RequestHandler } from 'express'
import { AuthenticationError, ForbiddenError } from '../lib/errors.js'
import type { AdministratorAuthenticationService } from '../services/administrator-auth.service.js'
import { csrfCookieName, readCookies, sessionCookieName } from '../security/cookies.js'
import { hashSecret, secretsMatch } from '../security/credentials.js'

export const createOriginProtection = (allowedOrigin: string): RequestHandler =>
  (request, _response, next) => {
    if (request.get('origin') !== allowedOrigin) {
      next(new ForbiddenError('This request origin is not allowed.'))
      return
    }
    next()
  }

export const createRequireAdministrator = (authentication: AdministratorAuthenticationService): RequestHandler =>
  async (request, _response, next) => {
    try {
      const sessionToken = readCookies(request.headers.cookie).get(sessionCookieName)
      const session = await authentication.getAuthenticatedSession(sessionToken)
      if (!session) throw new AuthenticationError()
      request.administratorSession = session
      next()
    } catch (error) {
      next(error)
    }
  }

export const requireCsrfProtection: RequestHandler = (request, _response, next) => {
  const session = request.administratorSession
  const csrfCookie = readCookies(request.headers.cookie).get(csrfCookieName)
  const csrfHeader = request.get('x-csrf-token')
  if (!session || !csrfCookie || !csrfHeader || !secretsMatch(csrfCookie, csrfHeader) || !secretsMatch(hashSecret(csrfHeader), session.csrfTokenHash)) {
    next(new ForbiddenError('A valid CSRF token is required.'))
    return
  }
  next()
}
