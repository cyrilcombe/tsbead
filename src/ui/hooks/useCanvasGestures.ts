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
const SWIPE_ACTIVATION_PX = 14
const PINCH_STEP_PX = 24
const SWIPE_STEP_PX = 30
const WHEEL_PINCH_STEP = 80
const WHEEL_SWIPE_ACTIVATION = 10
const WHEEL_SWIPE_STEP = 55

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
  const wheelPinchRemainderRef = useRef(0)
  const wheelSwipeRemainderRef = useRef(0)

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

    const onWheel = (event: WheelEvent) => {
      // Trackpad pinch on Chromium emits wheel+ctrlKey.
      if (event.ctrlKey) {
        wheelPinchRemainderRef.current += -event.deltaY
        while (wheelPinchRemainderRef.current >= WHEEL_PINCH_STEP) {
          onZoomIn()
          wheelPinchRemainderRef.current -= WHEEL_PINCH_STEP
        }
        while (wheelPinchRemainderRef.current <= -WHEEL_PINCH_STEP) {
          onZoomOut()
          wheelPinchRemainderRef.current += WHEEL_PINCH_STEP
        }
        event.preventDefault()
        return
      }

      // Two-finger horizontal swipe on trackpad.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) >= WHEEL_SWIPE_ACTIVATION) {
        wheelSwipeRemainderRef.current += event.deltaX
        while (wheelSwipeRemainderRef.current >= WHEEL_SWIPE_STEP) {
          onShiftRight()
          wheelSwipeRemainderRef.current -= WHEEL_SWIPE_STEP
        }
        while (wheelSwipeRemainderRef.current <= -WHEEL_SWIPE_STEP) {
          onShiftLeft()
          wheelSwipeRemainderRef.current += WHEEL_SWIPE_STEP
        }
        event.preventDefault()
      }
    }

    const onWindowWheel = (event: WheelEvent) => {
      // Hard-disable browser/page zoom from trackpad pinch (ctrl+wheel).
      if (event.ctrlKey) {
        event.preventDefault()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const hasZoomModifier = event.ctrlKey || event.metaKey
      if (!hasZoomModifier) {
        return
      }
      const key = event.key
      const isZoomKey =
        key === '+' ||
        key === '-' ||
        key === '=' ||
        key === '0' ||
        event.code === 'NumpadAdd' ||
        event.code === 'NumpadSubtract'
      if (isZoomKey) {
        event.preventDefault()
      }
    }

    elements.forEach((element) => {
      element.addEventListener('touchstart', onTouchStart, { passive: false })
      element.addEventListener('touchmove', onTouchMove, { passive: false })
      element.addEventListener('touchend', onTouchEnd, { passive: false })
      element.addEventListener('touchcancel', onTouchCancel, { passive: false })
      element.addEventListener('wheel', onWheel, { passive: false })
      element.addEventListener('gesturestart', preventGestureDefault, { passive: false } as AddEventListenerOptions)
      element.addEventListener('gesturechange', preventGestureDefault, { passive: false } as AddEventListenerOptions)
    })
    window.addEventListener('wheel', onWindowWheel, { passive: false })
    window.addEventListener('gesturestart', preventGestureDefault, { passive: false } as AddEventListenerOptions)
    window.addEventListener('gesturechange', preventGestureDefault, { passive: false } as AddEventListenerOptions)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      elements.forEach((element) => {
        element.removeEventListener('touchstart', onTouchStart)
        element.removeEventListener('touchmove', onTouchMove)
        element.removeEventListener('touchend', onTouchEnd)
        element.removeEventListener('touchcancel', onTouchCancel)
        element.removeEventListener('wheel', onWheel)
        element.removeEventListener('gesturestart', preventGestureDefault)
        element.removeEventListener('gesturechange', preventGestureDefault)
      })
      window.removeEventListener('wheel', onWindowWheel)
      window.removeEventListener('gesturestart', preventGestureDefault)
      window.removeEventListener('gesturechange', preventGestureDefault)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onShiftLeft, onShiftRight, onZoomIn, onZoomOut, panes])
}
