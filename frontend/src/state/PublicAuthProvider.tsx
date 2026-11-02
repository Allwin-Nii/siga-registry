import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { getPublicUserSession, loginPublicUser, logoutPublicUser, PublicAuthApiError, readPublicCsrfToken, registerPublicUser, type PublicUserSession } from '../api/publicAuthApi'
import { PublicAuthContext, type PublicAuthStatus, type PublicAuthContextValue } from './PublicAuthContext'

type AuthenticationState = { status: PublicAuthStatus; session?: PublicUserSession; csrfToken?: string; error?: Error }
const anonymousState: AuthenticationState = { status: 'anonymous' }

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthenticationState>({ status: 'checking' })

  const refreshSession = useCallback(async () => {
    setState({ status: 'checking' })
    try {
      const session = await getPublicUserSession()
      const csrfToken = readPublicCsrfToken()
      if (!csrfToken) throw new Error('Your public account security token is unavailable. Please sign in again.')
      setState({ status: 'authenticated', session, csrfToken })
    } catch (error) {
      if (error instanceof PublicAuthApiError && error.status === 401) setState(anonymousState)
      else setState({ status: 'error', error: error instanceof Error ? error : new Error('Unable to restore the public account session.') })
    }
  }, [])

  const establishSession = useCallback(async (operation: () => Promise<PublicUserSession>) => {
    const session = await operation()
    const csrfToken = readPublicCsrfToken()
    if (!csrfToken) {
      setState(anonymousState)
      throw new Error('Your public account security token is unavailable. Please sign in again.')
    }
    setState({ status: 'authenticated', session, csrfToken })
  }, [])

  const login = useCallback((email: string, password: string) => establishSession(() => loginPublicUser(email, password)), [establishSession])
  const register = useCallback((email: string, password: string) => establishSession(() => registerPublicUser(email, password)), [establishSession])

  const logout = useCallback(async () => {
    if (!state.csrfToken) {
      setState(anonymousState)
      return
    }
    try {
      await logoutPublicUser(state.csrfToken)
    } finally {
      setState(anonymousState)
    }
  }, [state.csrfToken])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshSession() }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshSession])

  const value = useMemo<PublicAuthContextValue>(() => ({ ...state, login, register, logout, refreshSession }), [login, logout, refreshSession, register, state])
  return <PublicAuthContext.Provider value={value}>{children}</PublicAuthContext.Provider>
}
