import { createContext } from 'react'
import type { PublicUserSession } from '../api/publicAuthApi'

export type PublicAuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error'

export type PublicAuthContextValue = {
  status: PublicAuthStatus
  session?: PublicUserSession
  csrfToken?: string
  error?: Error
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const PublicAuthContext = createContext<PublicAuthContextValue | undefined>(undefined)
