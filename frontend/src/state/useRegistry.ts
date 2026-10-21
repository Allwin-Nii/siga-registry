import { useContext } from 'react'
import { RegistryContext } from './RegistryContext'

export function useRegistry() {
  const context = useContext(RegistryContext)
  if (!context) throw new Error('useRegistry must be used within a RegistryProvider.')
  return context
}
