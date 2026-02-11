import { useEffect, useState } from 'react'
import type { ViewPaneId } from '../../domain/types'

const COMPACT_TABS_QUERY = '(max-width: 1024px)'
const SINGLE_PANE_QUERY = '(max-width: 500px)'

interface UseMobilePortraitSinglePaneOptions {
  isDraftVisible: boolean
  isCorrectedVisible: boolean
  isSimulationVisible: boolean
  isReportVisible: boolean
  onSetPaneVisibility: (pane: ViewPaneId, visible: boolean) => void
}

export function useMobilePortraitSinglePane({
  isDraftVisible,
  isCorrectedVisible,
  isSimulationVisible,
  isReportVisible,
  onSetPaneVisibility,
}: UseMobilePortraitSinglePaneOptions) {
  const [isCompactTabsMode, setIsCompactTabsMode] = useState(() => window.matchMedia(COMPACT_TABS_QUERY).matches)
  const [isSinglePaneMode, setIsSinglePaneMode] = useState(() => window.matchMedia(SINGLE_PANE_QUERY).matches)

  useEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_TABS_QUERY)
    const singlePaneQuery = window.matchMedia(SINGLE_PANE_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      if (event.media === COMPACT_TABS_QUERY) {
        setIsCompactTabsMode(event.matches)
      }
      if (event.media === SINGLE_PANE_QUERY) {
        setIsSinglePaneMode(event.matches)
      }
    }
    setIsCompactTabsMode(compactQuery.matches)
    setIsSinglePaneMode(singlePaneQuery.matches)
    compactQuery.addEventListener('change', onChange)
    singlePaneQuery.addEventListener('change', onChange)
    return () => {
      compactQuery.removeEventListener('change', onChange)
      singlePaneQuery.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isCompactTabsMode) {
      return
    }
    const panes: ViewPaneId[] = ['draft', 'corrected', 'simulation', 'report']
    const visibleByPane: Record<ViewPaneId, boolean> = {
      draft: isDraftVisible,
      corrected: isCorrectedVisible,
      simulation: isSimulationVisible,
      report: isReportVisible,
    }
    const visiblePanes = panes.filter((pane) => visibleByPane[pane])
    const maxVisiblePanes = isSinglePaneMode ? 1 : 2

    if (visiblePanes.length === 0) {
      panes.forEach((pane) => {
        onSetPaneVisibility(pane, pane === 'draft')
      })
      return
    }

    if (visiblePanes.length <= maxVisiblePanes) {
      return
    }

    const panesToKeep = new Set(visiblePanes.slice(0, maxVisiblePanes))
    panes.forEach((pane) => {
      onSetPaneVisibility(pane, panesToKeep.has(pane))
    })
  }, [
    isCompactTabsMode,
    isCorrectedVisible,
    isDraftVisible,
    isReportVisible,
    isSimulationVisible,
    isSinglePaneMode,
    onSetPaneVisibility,
  ])

  return {
    isCompactTabsMode,
    maxVisiblePanes: isCompactTabsMode ? (isSinglePaneMode ? 1 : 2) : 4,
  }
}
