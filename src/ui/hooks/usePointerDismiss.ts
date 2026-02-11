import { useEffect, type RefObject } from 'react'

interface UsePointerDismissOptions {
  enabled: boolean
  refs: Array<RefObject<HTMLElement | null>>
  onDismiss: () => void
}

export function usePointerDismiss({ enabled, refs, onDismiss }: UsePointerDismissOptions) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (refs.some((ref) => ref.current?.contains(target))) {
        return
      }
      onDismiss()
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [enabled, onDismiss, refs])
}
