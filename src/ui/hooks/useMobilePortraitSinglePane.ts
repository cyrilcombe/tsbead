import { useEffect } from 'react'
import type { ViewPaneId } from '../../domain/types'

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
  useEffect(() => {
    const mobilePortraitQuery = window.matchMedia('(max-width: 980px) and (orientation: portrait)')
    if (!mobilePortraitQuery.matches) {
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
  }, [isCorrectedVisible, isDraftVisible, isReportVisible, isSimulationVisible, onSelectMobileView])
}
