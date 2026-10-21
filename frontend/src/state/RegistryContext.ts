import { createContext } from 'react'
import type { RegistryContextValue } from './RegistryProvider'

export const RegistryContext = createContext<RegistryContextValue | undefined>(undefined)
