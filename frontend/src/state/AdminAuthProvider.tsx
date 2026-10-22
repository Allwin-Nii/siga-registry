import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AdministratorApiError, getAdministratorSession, loginAdministrator, logoutAdministrator, readCsrfToken, type AdministratorSession } from '../api/adminApi'
import { AdminAuthContext, type AdministratorAuthStatus, type AdminAuthContextValue } from './AdminAuthContext'

type AuthenticationState = {
  status: AdministratorAuthStatus
  session?: AdministratorSession
  csrfToken?: string
  error?: Error
}

const anonymousState: AuthenticationState = { status: 'anonymous' }

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthenticationState>({ status: 'checking' })

  const clearExpiredSession = useCallback(() => setState(anonymousState), [])

  const refreshSession = useCallback(async () => {
    setState({ status: 'checking' })
    try {
      const session = await getAdministratorSession()
      const csrfToken = readCsrfToken()
      if (!csrfToken) {
        setState({ status: 'error', error: new Error('Your administrator security token is unavailable. Please sign in again.') })
        return
      }
      setState({ status: 'authenticated', session, csrfToken })
    } catch (error) {
      if (error instanceof AdministratorApiError && error.status === 401) {
        setState(anonymousState)
        return
      }
      setState({ status: 'error', error: error instanceof Error ? error : new Error('Unable to restore the administrator session.') })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginAdministrator(email, password)
    const csrfToken = readCsrfToken()
    if (!csrfToken) {
      clearExpiredSession()
      throw new Error('Your administrator security token is unavailable. Please sign in again.')
    }
    setState({ status: 'authenticated', session, csrfToken })
  }, [clearExpiredSession])

  const logout = useCallback(async () => {
    const csrfToken = state.csrfToken
    if (!csrfToken) {
      clearExpiredSession()
      return
    }
    try {
      await logoutAdministrator(csrfToken)
      clearExpiredSession()
    } catch (error) {
      if (error instanceof AdministratorApiError && error.status === 401) {
        clearExpiredSession()
        return
      }
      throw error
    }
  }, [clearExpiredSession, state.csrfToken])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshSession() }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshSession])

  const value = useMemo<AdminAuthContextValue>(() => ({
    ...state,
    login,
    logout,
    refreshSession,
    clearExpiredSession,
  }), [clearExpiredSession, login, logout, refreshSession, state])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
