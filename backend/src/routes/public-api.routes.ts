import { Router } from 'express'
import type { CategoryEndpointService } from '../services/category.service.js'
import type { PublicEstablishmentEndpointService } from '../services/public-establishment.service.js'
import { parseDirectoryQuery, parseSlug } from '../validation/public-query.validation.js'

export type PublicApiServices = {
  categories: CategoryEndpointService
  establishments: PublicEstablishmentEndpointService
}

export const createPublicApiRouter = ({ categories, establishments }: PublicApiServices) => {
  const router = Router()

  router.get('/categories', async (_request, response) => {
    response.status(200).json({ data: await categories.listCategories() })
  })

  router.get('/establishments', async (request, response) => {
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

  router.get('/establishments/:slug', async (request, response) => {
    const establishment = await establishments.getPublishedBySlug(parseSlug(request.params.slug))
    response.status(200).json({ data: establishment })
  })

  return router
}
