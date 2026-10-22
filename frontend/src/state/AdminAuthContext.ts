import { createContext } from 'react'
import type { AdministratorSession } from '../api/adminApi'

export type AdministratorAuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error'

export type AdminAuthContextValue = {
  status: AdministratorAuthStatus
  session?: AdministratorSession
  csrfToken?: string
  error?: Error
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  clearExpiredSession: () => void
}

export const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)
