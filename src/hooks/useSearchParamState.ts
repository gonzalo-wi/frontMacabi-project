import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Estado de un parámetro de la query string, con API tipo useState.
 * Persiste en la URL: sobrevive back/forward del navegador, recarga y se puede compartir.
 * Cuando el valor es igual al default, se quita el parámetro para mantener la URL limpia.
 */
export function useSearchParamState(
  key: string,
  defaultValue: string,
): [string, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (!next || next === defaultValue) {
            params.delete(key)
          } else {
            params.set(key, next)
          }
          return params
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}
