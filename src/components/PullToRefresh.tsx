import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  /** Whether pulling is allowed (e.g. mobile only, no overlay open) */
  isPullable: boolean
  /** Triggered when the pull crosses the threshold. Must return a Promise. */
  onRefresh: () => Promise<unknown>
  /** Distance (px) the user must pull to trigger a refresh. */
  threshold?: number
  /** Max visual pull distance (px). */
  maxPull?: number
  /** Higher = harder to pull (drag is divided by this). */
  resistance?: number
  children: ReactNode
}

const RING_R = 9
const RING_C = 2 * Math.PI * RING_R
const SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Native-feeling pull-to-refresh built on raw touch events.
 *
 * The page scrolls on the window, so a gesture only engages when the window is
 * already at the top (scrollY <= 0) and the finger moves down. While engaged we
 * preventDefault to suppress the browser's overscroll/bounce, translate the
 * content down with resistance, and drive a circular progress ring. On release
 * past the threshold we hold at the threshold position, spin continuously while
 * onRefresh() runs, then spring back.
 */
export function PullToRefresh({
  isPullable,
  onRefresh,
  threshold = 70,
  maxPull = 120,
  resistance = 2.4,
  children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Mutable state read inside the native listeners (avoids re-subscribing).
  const startYRef = useRef<number | null>(null)
  const engagedRef = useRef(false)
  const crossedRef = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  // Keep latest props/callbacks available to the listeners without re-binding.
  const optsRef = useRef({ isPullable, onRefresh, threshold, maxPull, resistance })

  // Sync refs after each render so the (mount-only) native listeners read fresh values.
  useEffect(() => {
    refreshingRef.current = refreshing
    optsRef.current = { isPullable, onRefresh, threshold, maxPull, resistance }
  })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const clear = () => {
      startYRef.current = null
      engagedRef.current = false
    }

    const onTouchStart = (e: TouchEvent) => {
      const { isPullable } = optsRef.current
      if (!isPullable || refreshingRef.current) return
      if (window.scrollY > 0) return
      startYRef.current = e.touches[0].clientY
      engagedRef.current = false
      crossedRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const { isPullable, threshold, maxPull, resistance } = optsRef.current
      if (startYRef.current == null || !isPullable || refreshingRef.current) return

      const dy = e.touches[0].clientY - startYRef.current

      // Moving up, or no longer at the top → release the gesture and let the page scroll.
      if (dy <= 0 || window.scrollY > 0) {
        if (engagedRef.current) {
          engagedRef.current = false
          setDragging(false)
          setPull(0)
          pullRef.current = 0
        }
        startYRef.current = null
        return
      }

      if (!engagedRef.current) {
        engagedRef.current = true
        setDragging(true)
      }
      // Suppress native overscroll/bounce while we own the gesture.
      e.preventDefault()

      const dist = Math.min(dy / resistance, maxPull)
      pullRef.current = dist
      setPull(dist)

      const crossed = dist >= threshold
      if (crossed && !crossedRef.current && navigator.vibrate) navigator.vibrate(8)
      crossedRef.current = crossed
    }

    const onTouchEnd = () => {
      if (!engagedRef.current) {
        clear()
        return
      }
      const { onRefresh, threshold } = optsRef.current
      const shouldRefresh = pullRef.current >= threshold
      setDragging(false)
      clear()

      if (!shouldRefresh) {
        setPull(0)
        pullRef.current = 0
        crossedRef.current = false
        return
      }

      setRefreshing(true)
      setPull(threshold)
      pullRef.current = threshold
      Promise.resolve(onRefresh()).finally(() => {
        setRefreshing(false)
        setPull(0)
        pullRef.current = 0
        crossedRef.current = false
      })
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  const progress = Math.min(pull / threshold, 1)
  const indicatorY = Math.min(pull, threshold + 20) - 44
  const visible = pull > 4 || refreshing

  return (
    <div ref={rootRef} className="relative">
      {/* Floating circular indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center"
        style={{
          transform: `translateY(${indicatorY}px)`,
          opacity: visible ? Math.min(progress + 0.2, 1) : 0,
          transition: dragging
            ? 'opacity 0.15s ease'
            : `transform 0.35s ${SPRING}, opacity 0.2s ease`,
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-glow-blue backdrop-blur-sm">
          {refreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-primary"
              style={{
                transform: `rotate(${progress * 270}deg)`,
                transition: dragging ? 'none' : `transform 0.2s ease`,
              }}
            >
              <circle
                cx="12"
                cy="12"
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={2.5}
              />
              <circle
                cx="12"
                cy="12"
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
                transform="rotate(-90 12 12)"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: dragging ? 'none' : `transform 0.35s ${SPRING}`,
          willChange: pull > 0 ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
