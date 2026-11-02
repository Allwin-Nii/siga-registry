import { useContext } from 'react'
import { PublicAuthContext } from './PublicAuthContext'

export function usePublicAuth() {
  const context = useContext(PublicAuthContext)
  if (!context) throw new Error('usePublicAuth must be used within a PublicAuthProvider.')
  return context
}
