import { useEffect, useState } from 'react'
import type { ViewPaneId } from '../../domain/types'

const COMPACT_TABS_QUERY = '(max-width: 1200px)'

interface UseMobilePortraitSinglePaneOptions {
  isDraftVisible: boolean
  isCorrectedVisible: boolean
  isSimulationVisible: boolean
  isReportVisible: boolean
  onSelectMobileView: (pane: ViewPaneId) => void
}

export function useMobilePortraitSinglePane({
  isDraftVisible,
  isCorrectedVisible,
  isSimulationVisible,
  isReportVisible,
  onSelectMobileView,
}: UseMobilePortraitSinglePaneOptions) {
  const [isCompactTabsMode, setIsCompactTabsMode] = useState(() => window.matchMedia(COMPACT_TABS_QUERY).matches)

  useEffect(() => {
    const compactQuery = window.matchMedia(COMPACT_TABS_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setIsCompactTabsMode(event.matches)
    }
    setIsCompactTabsMode(compactQuery.matches)
    compactQuery.addEventListener('change', onChange)
    return () => {
      compactQuery.removeEventListener('change', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isCompactTabsMode) {
      return
    }
    const visibleCount = Number(isDraftVisible) + Number(isCorrectedVisible) + Number(isSimulationVisible) + Number(isReportVisible)
    if (visibleCount === 1) {
      return
    }
    const nextPane: ViewPaneId = isDraftVisible
      ? 'draft'
      : isCorrectedVisible
        ? 'corrected'
        : isSimulationVisible
          ? 'simulation'
          : 'report'
    onSelectMobileView(nextPane)
  }, [isCompactTabsMode, isCorrectedVisible, isDraftVisible, isReportVisible, isSimulationVisible, onSelectMobileView])
}
