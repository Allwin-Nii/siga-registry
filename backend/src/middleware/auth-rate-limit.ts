import type { RequestHandler } from 'express'
import { RateLimitError } from '../lib/errors.js'

type RateLimitEntry = { attempts: number; startedAt: number }

export const createAuthenticationRateLimiter = (maximumAttempts = 5, windowMs = 15 * 60 * 1000): RequestHandler => {
  const attempts = new Map<string, RateLimitEntry>()

  return (request, response, next) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLocaleLowerCase() : ''
    const key = `${request.ip}:${email}`
    const now = Date.now()
    const entry = attempts.get(key)
    const activeEntry = entry && now - entry.startedAt < windowMs ? entry : { attempts: 0, startedAt: now }

    if (activeEntry.attempts >= maximumAttempts) {
      response.setHeader('Retry-After', String(Math.ceil((windowMs - (now - activeEntry.startedAt)) / 1000)))
      next(new RateLimitError())
      return
    }

    activeEntry.attempts += 1
    attempts.set(key, activeEntry)
    next()
  }
}
