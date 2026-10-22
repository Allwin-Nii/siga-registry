import type { AuthenticatedAdministratorSession } from './administrator.js'

declare global {
  namespace Express {
    interface Request {
      administratorSession?: AuthenticatedAdministratorSession
    }
  }
}

export {}
