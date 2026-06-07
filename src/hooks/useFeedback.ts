import { useEffect, useState } from 'react'

export type FeedbackVariant = 'success' | 'error' | 'info'
export type Feedback = { text: string; variant: FeedbackVariant } | null

/**
 * Mensaje de feedback efímero con auto-cierre.
 * Reemplaza el `useState` + `useEffect(setTimeout)` repetido en las páginas.
 */
export function useFeedback(timeoutMs = 4000) {
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), timeoutMs)
    return () => clearTimeout(timer)
  }, [feedback, timeoutMs])

  return { feedback, setFeedback }
}
