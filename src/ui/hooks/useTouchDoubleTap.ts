import { type PointerEvent, useCallback, useRef } from 'react'

interface TapState<T> {
  key: T | null
  timestamp: number
}

const DEFAULT_DOUBLE_TAP_DELAY_MS = 350

export function useTouchDoubleTap<T>(onDoubleTap: (key: T) => void, delayMs = DEFAULT_DOUBLE_TAP_DELAY_MS) {
  const tapStateRef = useRef<TapState<T>>({ key: null, timestamp: 0 })

  return useCallback(
    (key: T, event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') {
        return
      }

      const now = performance.now()
      const previous = tapStateRef.current
      if (previous.key !== null && Object.is(previous.key, key) && now - previous.timestamp <= delayMs) {
        tapStateRef.current = { key: null, timestamp: 0 }
        onDoubleTap(key)
        return
      }

      tapStateRef.current = { key, timestamp: now }
    },
    [delayMs, onDoubleTap],
  )
}
