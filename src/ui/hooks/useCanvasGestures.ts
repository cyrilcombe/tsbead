import { useEffect, useRef, type RefObject } from 'react'

interface UseCanvasGesturesOptions {
  panes: Array<RefObject<HTMLDivElement | null>>
  onZoomIn: () => void
  onZoomOut: () => void
  onShiftLeft: () => void
  onShiftRight: () => void
}

type GestureMode = 'undecided' | 'pinch' | 'swipe'

interface GestureState {
  active: boolean
  mode: GestureMode
  startDistance: number
  lastDistance: number
  startCenterX: number
  lastCenterX: number
  pinchRemainder: number
  swipeRemainder: number
}

const PINCH_ACTIVATION_PX = 10
const SWIPE_ACTIVATION_PX = 22
const PINCH_STEP_PX = 24
const SWIPE_STEP_PX = 56

function getDistance(touchA: Touch, touchB: Touch): number {
  const dx = touchA.clientX - touchB.clientX
  const dy = touchA.clientY - touchB.clientY
  return Math.hypot(dx, dy)
}

function getCenterX(touchA: Touch, touchB: Touch): number {
  return (touchA.clientX + touchB.clientX) / 2
}

export function useCanvasGestures({
  panes,
  onZoomIn,
  onZoomOut,
  onShiftLeft,
  onShiftRight,
}: UseCanvasGesturesOptions) {
  const gestureRef = useRef<GestureState>({
    active: false,
    mode: 'undecided',
    startDistance: 0,
    lastDistance: 0,
    startCenterX: 0,
    lastCenterX: 0,
    pinchRemainder: 0,
    swipeRemainder: 0,
  })

  useEffect(() => {
    const elements = panes
      .map((paneRef) => paneRef.current)
      .filter((pane): pane is HTMLDivElement => pane !== null)

    if (elements.length === 0) {
      return
    }

    const resetGesture = () => {
      gestureRef.current = {
        active: false,
        mode: 'undecided',
        startDistance: 0,
        lastDistance: 0,
        startCenterX: 0,
        lastCenterX: 0,
        pinchRemainder: 0,
        swipeRemainder: 0,
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        return
      }
      const touchA = event.touches[0]
      const touchB = event.touches[1]
      const distance = getDistance(touchA, touchB)
      const centerX = getCenterX(touchA, touchB)
      gestureRef.current = {
        active: true,
        mode: 'undecided',
        startDistance: distance,
        lastDistance: distance,
        startCenterX: centerX,
        lastCenterX: centerX,
        pinchRemainder: 0,
        swipeRemainder: 0,
      }
      event.preventDefault()
    }

    const onTouchMove = (event: TouchEvent) => {
      const state = gestureRef.current
      if (!state.active || event.touches.length < 2) {
        return
      }

      const touchA = event.touches[0]
      const touchB = event.touches[1]
      const distance = getDistance(touchA, touchB)
      const centerX = getCenterX(touchA, touchB)

      if (state.mode === 'undecided') {
        const distanceTravel = Math.abs(distance - state.startDistance)
        const horizontalTravel = Math.abs(centerX - state.startCenterX)
        if (distanceTravel >= PINCH_ACTIVATION_PX || horizontalTravel >= SWIPE_ACTIVATION_PX) {
          state.mode = distanceTravel >= horizontalTravel * 0.7 ? 'pinch' : 'swipe'
        }
      }

      if (state.mode === 'pinch') {
        state.pinchRemainder += distance - state.lastDistance
        while (state.pinchRemainder >= PINCH_STEP_PX) {
          onZoomIn()
          state.pinchRemainder -= PINCH_STEP_PX
        }
        while (state.pinchRemainder <= -PINCH_STEP_PX) {
          onZoomOut()
          state.pinchRemainder += PINCH_STEP_PX
        }
      } else if (state.mode === 'swipe') {
        state.swipeRemainder += centerX - state.lastCenterX
        while (state.swipeRemainder >= SWIPE_STEP_PX) {
          onShiftRight()
          state.swipeRemainder -= SWIPE_STEP_PX
        }
        while (state.swipeRemainder <= -SWIPE_STEP_PX) {
          onShiftLeft()
          state.swipeRemainder += SWIPE_STEP_PX
        }
      }

      state.lastDistance = distance
      state.lastCenterX = centerX
      event.preventDefault()
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        resetGesture()
      }
    }

    const onTouchCancel = () => {
      resetGesture()
    }

    const preventGestureDefault = (event: Event) => {
      event.preventDefault()
    }

    elements.forEach((element) => {
      element.addEventListener('touchstart', onTouchStart, { passive: false })
      element.addEventListener('touchmove', onTouchMove, { passive: false })
      element.addEventListener('touchend', onTouchEnd, { passive: false })
      element.addEventListener('touchcancel', onTouchCancel, { passive: false })
      element.addEventListener('gesturestart', preventGestureDefault, { passive: false } as AddEventListenerOptions)
      element.addEventListener('gesturechange', preventGestureDefault, { passive: false } as AddEventListenerOptions)
    })

    return () => {
      elements.forEach((element) => {
        element.removeEventListener('touchstart', onTouchStart)
        element.removeEventListener('touchmove', onTouchMove)
        element.removeEventListener('touchend', onTouchEnd)
        element.removeEventListener('touchcancel', onTouchCancel)
        element.removeEventListener('gesturestart', preventGestureDefault)
        element.removeEventListener('gesturechange', preventGestureDefault)
      })
    }
  }, [onShiftLeft, onShiftRight, onZoomIn, onZoomOut, panes])
}
