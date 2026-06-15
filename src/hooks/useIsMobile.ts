import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 1023
const DESKTOP_BREAKPOINT = 768

/** Hook reactivo para una media query CSS. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Mobile = viewport ≤ 1023px (breakpoint `lg`). */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`)
}

/** Desktop = viewport ≥ 768px (breakpoint `md`). */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
}
