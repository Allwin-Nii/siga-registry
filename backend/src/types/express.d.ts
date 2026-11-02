import type { AuthenticatedAdministratorSession } from './administrator.js'
import type { AuthenticatedPublicUserSession } from './public-user.js'

declare global {
  namespace Express {
    interface Request {
      administratorSession?: AuthenticatedAdministratorSession
      publicUserSession?: AuthenticatedPublicUserSession
    }
  }
}

export {}
