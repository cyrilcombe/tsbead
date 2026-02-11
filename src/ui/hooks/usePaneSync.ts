import { useCallback, useEffect, useRef, useState } from 'react'

const ZOOM_TABLE = [6, 8, 10, 12, 14, 16, 18, 20]

function getCellSize(zoomIndex: number): number {
  return ZOOM_TABLE[Math.max(0, Math.min(zoomIndex, ZOOM_TABLE.length - 1))]
}

interface UsePaneSyncOptions {
  rows: number[][]
  height: number
  zoomIndex: number
  sharedScrollRow: number
  isDraftVisible: boolean
  isCorrectedVisible: boolean
  isSimulationVisible: boolean
  isReportVisible: boolean
  isZoomFitMode: boolean
  shift: number
  setViewScroll: (row: number) => void
  setZoom: (zoomIndex: number) => void
}

export function usePaneSync({
  rows,
  height,
  zoomIndex,
  sharedScrollRow,
  isDraftVisible,
  isCorrectedVisible,
  isSimulationVisible,
  isReportVisible,
  isZoomFitMode,
  shift,
  setViewScroll,
  setZoom,
}: UsePaneSyncOptions) {
  const draftScrollRef = useRef<HTMLDivElement | null>(null)
  const correctedScrollRef = useRef<HTMLDivElement | null>(null)
  const simulationScrollRef = useRef<HTMLDivElement | null>(null)
  const syncingScrollRef = useRef(false)
  const [sharedMaxScrollRow, setSharedMaxScrollRow] = useState(0)
  const [viewportTick, setViewportTick] = useState(0)

  const getPaneMaxScrollTop = useCallback((pane: HTMLDivElement | null): number => {
    if (!pane) {
      return 0
    }
    return Math.max(0, pane.scrollHeight - pane.clientHeight)
  }, [])

  const getPaneMaxScrollRow = useCallback(
    (pane: HTMLDivElement | null): number => {
      const maxScrollTop = getPaneMaxScrollTop(pane)
      return Math.max(0, Math.ceil(maxScrollTop / getCellSize(zoomIndex)))
    },
    [getPaneMaxScrollTop, zoomIndex],
  )

  const getSharedMaxRow = useCallback((): number => {
    const referencePane =
      (isDraftVisible ? draftScrollRef.current : null) ??
      (isCorrectedVisible ? correctedScrollRef.current : null) ??
      (isSimulationVisible ? simulationScrollRef.current : null)
    if (!referencePane) {
      return Math.max(0, height - 1)
    }
    return getPaneMaxScrollRow(referencePane)
  }, [getPaneMaxScrollRow, height, isCorrectedVisible, isDraftVisible, isSimulationVisible])

  const onPaneScroll = useCallback(
    (source: HTMLDivElement) => {
      if (syncingScrollRef.current) {
        return
      }
      const maxScrollTop = getPaneMaxScrollTop(source)
      const sourceMaxRow = getPaneMaxScrollRow(source)
      const sourceScrollRow = source.scrollTop >= maxScrollTop - 1 ? sourceMaxRow : Math.round(source.scrollTop / getCellSize(zoomIndex))
      const nextScrollRow = Math.max(0, Math.min(sourceMaxRow, sourceScrollRow))
      setViewScroll(nextScrollRow)
    },
    [getPaneMaxScrollRow, getPaneMaxScrollTop, setViewScroll, zoomIndex],
  )

  const getPaneCanvasViewportWidth = (pane: HTMLDivElement): number => {
    const style = window.getComputedStyle(pane)
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0
    const paddingRight = Number.parseFloat(style.paddingRight) || 0
    return Math.max(0, pane.clientWidth - paddingLeft - paddingRight)
  }

  const getFittedZoomIndex = useCallback((): number => {
    const visiblePanes: HTMLDivElement[] = []
    if (isDraftVisible && draftScrollRef.current) {
      visiblePanes.push(draftScrollRef.current)
    }
    if (isCorrectedVisible && correctedScrollRef.current) {
      visiblePanes.push(correctedScrollRef.current)
    }
    if (isSimulationVisible && simulationScrollRef.current) {
      visiblePanes.push(simulationScrollRef.current)
    }
    if (visiblePanes.length === 0) {
      return zoomIndex
    }

    const currentCellSize = getCellSize(zoomIndex)
    const paneContentUnits = visiblePanes.map((pane) => {
      const canvas = pane.querySelector('canvas')
      if (!canvas) {
        return null
      }
      const isDraftCanvas = canvas.classList.contains('bead-canvas')
      const fixedPixels = isDraftCanvas ? 37 : 2
      const dynamicWidth = Math.max(0, canvas.width - fixedPixels)
      const units = dynamicWidth / currentCellSize
      return {
        pane,
        fixedPixels,
        units,
      }
    })

    for (let candidate = ZOOM_TABLE.length - 1; candidate >= 0; candidate -= 1) {
      const candidateCellSize = getCellSize(candidate)
      const fits = paneContentUnits.every((item) => {
        if (!item) {
          return true
        }
        const requiredCanvasWidth = Math.ceil(item.units * candidateCellSize) + item.fixedPixels
        return requiredCanvasWidth <= getPaneCanvasViewportWidth(item.pane) + 1
      })
      if (fits) {
        return candidate
      }
    }

    return 0
  }, [isCorrectedVisible, isDraftVisible, isSimulationVisible, zoomIndex])

  const applyZoomFit = useCallback(() => {
    setZoom(getFittedZoomIndex())
  }, [getFittedZoomIndex, setZoom])

  useEffect(() => {
    const onResize = () => {
      setViewportTick((value) => value + 1)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (!isZoomFitMode) {
      return
    }
    const frame = requestAnimationFrame(() => {
      applyZoomFit()
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [
    applyZoomFit,
    rows,
    shift,
    isCorrectedVisible,
    isDraftVisible,
    isReportVisible,
    isSimulationVisible,
    isZoomFitMode,
    viewportTick,
  ])

  useEffect(() => {
    const nextSharedMaxRow = getSharedMaxRow()
    const frame = requestAnimationFrame(() => {
      setSharedMaxScrollRow((current) => (current === nextSharedMaxRow ? current : nextSharedMaxRow))
    })

    const targetScrollRow = Math.max(0, Math.min(nextSharedMaxRow, sharedScrollRow))
    if (targetScrollRow !== sharedScrollRow) {
      setViewScroll(targetScrollRow)
      return () => {
        cancelAnimationFrame(frame)
      }
    }

    syncingScrollRef.current = true
    const paneRefs = [draftScrollRef.current, correctedScrollRef.current, simulationScrollRef.current]
    for (const pane of paneRefs) {
      if (!pane) {
        continue
      }
      const paneMaxRow = getPaneMaxScrollRow(pane)
      const paneMaxScrollTop = getPaneMaxScrollTop(pane)
      const paneTargetRow = Math.min(targetScrollRow, paneMaxRow)
      pane.scrollTop = paneTargetRow >= paneMaxRow ? paneMaxScrollTop : paneTargetRow * getCellSize(zoomIndex)
    }
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [
    getPaneMaxScrollRow,
    getPaneMaxScrollTop,
    getSharedMaxRow,
    isCorrectedVisible,
    isDraftVisible,
    isSimulationVisible,
    rows,
    setViewScroll,
    sharedScrollRow,
    viewportTick,
    zoomIndex,
  ])

  return {
    draftScrollRef,
    correctedScrollRef,
    simulationScrollRef,
    sharedMaxScrollRow,
    onPaneScroll,
    applyZoomFit,
  }
}
