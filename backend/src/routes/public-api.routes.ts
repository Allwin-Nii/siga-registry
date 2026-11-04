import { Router } from 'express'
import type { CategoryEndpointService } from '../services/category.service.js'
import type { PublicEstablishmentEndpointService } from '../services/public-establishment.service.js'
import { parseDirectoryQuery, parseEntityOptionsQuery, parseSlug } from '../validation/public-query.validation.js'
import { createRequirePublicUser } from '../middleware/public-auth-security.js'
import type { PublicAuthenticationService } from '../services/public-auth.service.js'

export type PublicApiServices = {
  categories: CategoryEndpointService
  establishments: PublicEstablishmentEndpointService
  authentication: PublicAuthenticationService
}

export const createPublicApiRouter = ({ categories, establishments, authentication }: PublicApiServices) => {
  const router = Router()
  const requirePublicUser = createRequirePublicUser(authentication)

  router.get('/categories', requirePublicUser, async (_request, response) => {
    response.status(200).json({ data: await categories.listCategories() })
  })

  router.get('/dashboard', requirePublicUser, async (_request, response) => {
    response.status(200).json({ data: await establishments.getDashboard() })
  })

  router.get('/establishments', requirePublicUser, async (request, response) => {
    const directory = await establishments.getDirectory(parseDirectoryQuery(request.query))
    response.status(200).json({
      data: directory.data,
      meta: {
        page: directory.page,
        pageSize: directory.pageSize,
        total: directory.total,
        totalPages: directory.totalPages,
      },
    })
  })

  router.get('/establishments/options', requirePublicUser, async (request, response) => {
    const options = await establishments.getEntityOptions(parseEntityOptionsQuery(request.query))
    response.status(200).json({
      data: options.data,
      meta: {
        page: options.page,
        pageSize: options.pageSize,
        total: options.total,
        totalPages: options.totalPages,
      },
    })
  })

  router.get('/establishments/:slug', requirePublicUser, async (request, response) => {
    const establishment = await establishments.getPublishedBySlug(parseSlug(request.params.slug))
    response.status(200).json({ data: establishment })
  })

  return router
}
