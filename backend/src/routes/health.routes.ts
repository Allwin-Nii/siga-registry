import { Router } from 'express'

export type DatabaseHealthCheck = () => Promise<boolean>

export const createHealthRouter = (checkDatabase?: DatabaseHealthCheck) => {
  const router = Router()

  router.get('/health', async (_request, response) => {
    let database: 'not_checked' | 'available' | 'unavailable' = 'not_checked'
    if (checkDatabase) {
      database = await checkDatabase() ? 'available' : 'unavailable'
    }
    response.status(200).json({ status: 'ok', api: 'available', database })
  })

  return router
}
