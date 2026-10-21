import { once } from 'node:events'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const servers: Server[] = []

const request = async (path: string, checkDatabase?: () => Promise<boolean>) => {
  const server = createApp({ corsOrigin: 'http://localhost:5173', checkDatabase }).listen(0)
  servers.push(server)
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.')
  return fetch(`http://127.0.0.1:${address.port}${path}`)
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('Express application', () => {
  it('initializes safely without a database connection and exposes API availability', async () => {
    const response = await request('/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', api: 'available', database: 'not_checked' })
  })

  it('reports database connectivity separately from API availability', async () => {
    const response = await request('/api/health', async () => false)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', api: 'available', database: 'unavailable' })
  })
})
