import { useCallback, useEffect, useReducer, useState } from 'react'

type ResourceState<T> = {
  data?: T
  error?: Error
  loading: boolean
}

export type PublicApiResource<T> = ResourceState<T> & {
  retry: () => void
}

type ResourceAction<T> =
  | { type: 'loading' }
  | { type: 'loaded'; data: T }
  | { type: 'failed'; error: Error }

const resourceReducer = <T>(_state: ResourceState<T>, action: ResourceAction<T>): ResourceState<T> => {
  switch (action.type) {
    case 'loading':
      return { loading: true }
    case 'loaded':
      return { data: action.data, loading: false }
    case 'failed':
      return { error: action.error, loading: false }
  }
}

export function usePublicApiResource<T>(load: (signal: AbortSignal) => Promise<T>): PublicApiResource<T> {
  const [state, dispatch] = useReducer(resourceReducer<T>, { loading: true })
  const [requestVersion, setRequestVersion] = useState(0)
  const retry = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'loading' })

    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) dispatch({ type: 'loaded', data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'failed', error: error instanceof Error ? error : new Error('Unable to load registry data.') })
        }
      })

    return () => controller.abort()
  }, [load, requestVersion])

  return { ...state, retry }
}
