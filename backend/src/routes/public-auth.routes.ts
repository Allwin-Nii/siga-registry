import { Router, type Response } from 'express'
import { createAuthenticationRateLimiter } from '../middleware/auth-rate-limit.js'
import { createPublicOriginProtection, createRequirePublicUser, requirePublicCsrfProtection } from '../middleware/public-auth-security.js'
import type { PublicAuthenticationResult, PublicAuthenticationService } from '../services/public-auth.service.js'
import { clearPublicSessionCookies, createPublicSessionCookies, publicSessionCookieName } from '../security/public-cookies.js'
import { readCookies } from '../security/cookies.js'
import type { SessionCookieSettings } from '../security/cookies.js'

export type PublicAuthApiServices = {
  authentication: PublicAuthenticationService
  allowedOrigin: string
  cookieSettings: SessionCookieSettings
}

const asRecord = (value: unknown) => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}

export const createPublicAuthRouter = ({ authentication, allowedOrigin, cookieSettings }: PublicAuthApiServices) => {
  const router = Router()
  const requireOrigin = createPublicOriginProtection(allowedOrigin)
  const requirePublicUser = createRequirePublicUser(authentication)
  const authRateLimit = createAuthenticationRateLimiter()

  const respondWithSession = (result: PublicAuthenticationResult, response: Response, status: number) => {
    response.setHeader('Set-Cookie', createPublicSessionCookies(result.sessionToken, result.csrfToken, cookieSettings))
    response.status(status).json({ data: { publicUser: result.publicUser, expiresAt: result.expiresAt.toISOString() } })
  }

  router.post('/public/auth/register', requireOrigin, authRateLimit, async (request, response) => {
    respondWithSession(await authentication.register(asRecord(request.body)), response, 201)
  })

  router.post('/public/auth/login', requireOrigin, authRateLimit, async (request, response) => {
    respondWithSession(await authentication.login(asRecord(request.body)), response, 200)
  })

  router.get('/public/auth/session', requirePublicUser, (request, response) => {
    response.status(200).json({ data: {
      publicUser: request.publicUserSession!.publicUser,
      expiresAt: request.publicUserSession!.expiresAt.toISOString(),
    } })
  })

  router.post('/public/auth/logout', requirePublicUser, requireOrigin, requirePublicCsrfProtection, async (request, response) => {
    const sessionToken = readCookies(request.headers.cookie).get(publicSessionCookieName)
    if (sessionToken) await authentication.logout(sessionToken)
    response.setHeader('Set-Cookie', clearPublicSessionCookies(cookieSettings))
    response.status(204).end()
  })

  return router
}
