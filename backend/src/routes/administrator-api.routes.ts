import { raw, Router } from 'express'
import { createOriginProtection, createRequireAdministrator, requireCsrfProtection } from '../middleware/administrator-security.js'
import type { AdministratorAuthenticationService } from '../services/administrator-auth.service.js'
import type { AdministratorEstablishmentService } from '../services/administrator-establishment.service.js'
import type { AdministratorAnalyticsService } from '../services/administrator-analytics.service.js'
import type { CategoryReader } from '../repositories/category.repository.js'
import { isImageUploadKind, readMultipartFile, readMultipartImage, type ImageUploadService } from '../services/image-upload.service.js'
import type { BulkImportService } from '../services/bulk-import.service.js'
import { clearSessionCookies, createSessionCookies, readCookies, sessionCookieName, type SessionCookieSettings } from '../security/cookies.js'
import { ValidationError } from '../lib/errors.js'
import { workflowStatusCodes, type WorkflowStatusCode } from '../types/workflow.js'

export type AdministratorApiServices = {
  authentication: AdministratorAuthenticationService
  analytics: Pick<AdministratorAnalyticsService, 'getDashboard'>
  establishments: Pick<AdministratorEstablishmentService, 'list' | 'create' | 'update' | 'setPublication' | 'delete'>
  categories: Pick<CategoryReader, 'list'>
  uploads?: Pick<ImageUploadService, 'upload'>
  imports?: Pick<BulkImportService, 'createTemplate' | 'preview' | 'confirm' | 'errorReport'>
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
  analytics,
  establishments,
  categories,
  uploads,
  imports,
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

  router.get('/admin/analytics', requireAdministrator, async (_request, response) => {
    response.status(200).json({ data: await analytics.getDashboard() })
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

  if (uploads) {
    router.post('/admin/uploads/:kind', ...protectMutation, raw({ type: () => true, limit: '11mb' }), async (request, response) => {
      const kind = request.params.kind
      if (typeof kind !== 'string' || !isImageUploadKind(kind)) {
        throw new ValidationError('Invalid upload type.', { kind: 'Upload either a logo or a cover image.' })
      }
      const imageFile = readMultipartImage(request.body, request.get('content-type'))
      const image = await uploads.upload(kind, imageFile.body, imageFile.contentType)
      response.status(201).json({ data: image })
    })
  }

  if (imports) {
    router.get('/admin/imports/template', requireAdministrator, async (_request, response) => {
      const template = await imports.createTemplate()
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.setHeader('Content-Disposition', 'attachment; filename="siga-registry-entity-import-template.xlsx"')
      response.status(200).send(template)
    })

    router.post('/admin/imports/preview', ...protectMutation, raw({ type: () => true, limit: '6mb' }), async (request, response) => {
      const file = readMultipartFile(request.body, request.get('content-type'), 'file')
      const preview = await imports.preview(file)
      response.status(200).json({ data: preview })
    })

    router.post('/admin/imports/:id/confirm', ...protectMutation, async (request, response) => {
      const id = request.params.id
      if (typeof id !== 'string') throw new ValidationError('Invalid import preview.')
      response.status(200).json({ data: await imports.confirm(id) })
    })

    router.get('/admin/imports/:id/error-report', requireAdministrator, (request, response) => {
      const id = request.params.id
      if (typeof id !== 'string') throw new ValidationError('Invalid import preview.')
      response.setHeader('Content-Type', 'text/csv; charset=utf-8')
      response.setHeader('Content-Disposition', 'attachment; filename="siga-registry-import-errors.csv"')
      response.status(200).send(imports.errorReport(id))
    })
  }

  router.get('/admin/categories', requireAdministrator, async (_request, response) => {
    response.status(200).json({ data: await categories.list() })
  })

  return router
}
