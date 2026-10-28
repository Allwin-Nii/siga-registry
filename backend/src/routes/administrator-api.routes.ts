import { Router } from 'express'
import { createOriginProtection, createRequireAdministrator, requireCsrfProtection } from '../middleware/administrator-security.js'
import type { AdministratorAuthenticationService } from '../services/administrator-auth.service.js'
import type { AdministratorEstablishmentService } from '../services/administrator-establishment.service.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import { clearSessionCookies, createSessionCookies, readCookies, sessionCookieName, type SessionCookieSettings } from '../security/cookies.js'
import { ValidationError } from '../lib/errors.js'
import { workflowStatusCodes, type WorkflowStatusCode } from '../types/workflow.js'

export type AdministratorApiServices = {
  authentication: AdministratorAuthenticationService
  establishments: Pick<AdministratorEstablishmentService, 'list' | 'create' | 'update' | 'setPublication' | 'delete'>
  categories: Pick<CategoryReader, 'list'>
  allowedOrigin: string
  cookieSettings: SessionCookieSettings
}

const asRecord = (value: unknown) => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}

const parseIdentifier = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw new ValidationError(`Invalid ${field}.`, { [field]: 'Use a positive whole number.' })
  if (!/^\d+$/.test(value)) throw new ValidationError(`Invalid ${field}.`, { [field]: 'Use a positive whole number.' })
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new ValidationError(`Invalid ${field}.`, { [field]: 'Use a positive whole number.' })
  return parsed
}

const oneQueryValue = (value: unknown, field: string) => {
  if (Array.isArray(value) || (value !== undefined && typeof value !== 'string')) {
    throw new ValidationError('Invalid query parameters.', { [field]: 'Provide one text value.' })
  }
  return value as string | undefined
}

const parsePositiveQueryInteger = (value: unknown, field: string, fallback: number, maximum: number) => {
  const stringValue = oneQueryValue(value, field)
  if (stringValue === undefined) return fallback
  if (!/^\d+$/.test(stringValue)) throw new ValidationError('Invalid query parameters.', { [field]: 'Use a whole number.' })
  const parsed = Number(stringValue)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ValidationError('Invalid query parameters.', { [field]: `Use a number between 1 and ${maximum}.` })
  }
  return parsed
}

const parseAdministratorListQuery = (query: Record<string, unknown>) => {
  const status = oneQueryValue(query.status, 'status')
  if (status && !workflowStatusCodes.includes(status as WorkflowStatusCode)) {
    throw new ValidationError('Invalid query parameters.', { status: 'Use a configured workflow status.' })
  }
  return {
    page: parsePositiveQueryInteger(query.page, 'page', 1, 10_000),
    pageSize: parsePositiveQueryInteger(query.pageSize, 'pageSize', 20, 100),
    ...(status ? { statuses: [status as WorkflowStatusCode] } : {}),
  }
}

export const createAdministratorApiRouter = ({
  authentication,
  establishments,
  categories,
  allowedOrigin,
  cookieSettings,
}: AdministratorApiServices) => {
  const router = Router()
  const requireAdministrator = createRequireAdministrator(authentication)
  const requireAllowedOrigin = createOriginProtection(allowedOrigin)
  const protectMutation = [requireAdministrator, requireAllowedOrigin, requireCsrfProtection]

  router.post('/admin/auth/login', requireAllowedOrigin, async (request, response) => {
    const login = await authentication.login(asRecord(request.body))
    response.setHeader('Set-Cookie', createSessionCookies(login.sessionToken, login.csrfToken, cookieSettings))
    response.status(200).json({ data: { administrator: login.administrator, expiresAt: login.expiresAt.toISOString() } })
  })

  router.get('/admin/auth/session', requireAdministrator, (request, response) => {
    response.status(200).json({
      data: {
        administrator: request.administratorSession!.administrator,
        expiresAt: request.administratorSession!.expiresAt.toISOString(),
      },
    })
  })

  router.post('/admin/auth/logout', ...protectMutation, async (request, response) => {
    const sessionToken = readCookies(request.headers.cookie).get(sessionCookieName)
    if (sessionToken) await authentication.logout(sessionToken)
    response.setHeader('Set-Cookie', clearSessionCookies(cookieSettings))
    response.status(204).end()
  })

  router.get('/admin/establishments', requireAdministrator, async (request, response) => {
    const result = await establishments.list(parseAdministratorListQuery(request.query))
    response.status(200).json({
      data: result.data,
      meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
    })
  })

  router.post('/admin/establishments', ...protectMutation, async (request, response) => {
    const establishment = await establishments.create(asRecord(request.body))
    response.status(201).json({ data: establishment })
  })

  router.patch('/admin/establishments/:id', ...protectMutation, async (request, response) => {
    const establishment = await establishments.update(parseIdentifier(request.params.id, 'id'), asRecord(request.body))
    response.status(200).json({ data: establishment })
  })

  router.patch('/admin/establishments/:id/publication', ...protectMutation, async (request, response) => {
    const establishment = await establishments.setPublication(
      parseIdentifier(request.params.id, 'id'),
      asRecord(request.body).published,
    )
    response.status(200).json({ data: establishment })
  })

  router.delete('/admin/establishments/:id', ...protectMutation, async (request, response) => {
    await establishments.delete(parseIdentifier(request.params.id, 'id'))
    response.status(204).end()
  })

  router.get('/admin/categories', requireAdministrator, async (_request, response) => {
    response.status(200).json({ data: await categories.list() })
  })

  return router
}
