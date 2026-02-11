import type { RefObject } from 'react'
import type { ColorCount, ReportSummary } from '../../domain/report'
import type { CellPoint, JBeadDocument, RgbaColor, SelectionRect } from '../../domain/types'
import { useI18n } from '../../i18n/I18nProvider'
import { BeadCanvas } from '../canvas/BeadCanvas'
import { BeadPreviewCanvas } from '../canvas/BeadPreviewCanvas'
import { ReportPanel } from './ReportPanel'

interface WorkspacePanelsProps {
  hasCanvasPaneVisible: boolean
  visibleCanvasPaneCount: number
  hasAnyPaneVisible: boolean
  isReportVisible: boolean
  isDraftVisible: boolean
  isCorrectedVisible: boolean
  isSimulationVisible: boolean
  width: number
  height: number
  document: JBeadDocument
  selectionOverlay: SelectionRect | null
  linePreview: SelectionRect | null
  draftScrollRef: RefObject<HTMLDivElement | null>
  correctedScrollRef: RefObject<HTMLDivElement | null>
  simulationScrollRef: RefObject<HTMLDivElement | null>
  sharedMaxScrollRow: number
  sharedScrollRow: number
  reportSummary: ReportSummary
  visibleColorCounts: ColorCount[]
  colorToCss: (color: RgbaColor) => string
  onPaneScroll: (source: HTMLDivElement) => void
  onSharedScrollChange: (row: number) => void
  onDraftPointerDown: (point: CellPoint) => void
  onPreviewPointerDown: (point: CellPoint) => void
  onPointerMove: (point: CellPoint) => void
  onPointerUp: (point: CellPoint) => void
  onPointerCancel: () => void
}

export function WorkspacePanels({
  hasCanvasPaneVisible,
  visibleCanvasPaneCount,
  hasAnyPaneVisible,
  isReportVisible,
  isDraftVisible,
  isCorrectedVisible,
  isSimulationVisible,
  width,
  height,
  document,
  selectionOverlay,
  linePreview,
  draftScrollRef,
  correctedScrollRef,
  simulationScrollRef,
  sharedMaxScrollRow,
  sharedScrollRow,
  reportSummary,
  visibleColorCounts,
  colorToCss,
  onPaneScroll,
  onSharedScrollChange,
  onDraftPointerDown,
  onPreviewPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: WorkspacePanelsProps) {
  const { t } = useI18n()

  return (
    <section className={`preview-with-scrollbar ${hasCanvasPaneVisible ? 'has-canvas' : 'no-canvas'} ${isReportVisible ? 'has-report' : 'no-report'}`}>
      {hasCanvasPaneVisible || !isReportVisible ? (
        <section className={`preview-grid ${visibleCanvasPaneCount <= 1 ? 'single-canvas' : ''}`}>
          {isDraftVisible ? (
            <section className="panel canvas-panel draft-panel">
              <div className="panel-title">
                <h2>{t('view.draft')}</h2>
                <span>
                  {width} x {height}
                </span>
              </div>
              <div
                ref={draftScrollRef}
                className="canvas-scroll"
                onScroll={(event) => onPaneScroll(event.currentTarget)}
              >
                <BeadCanvas
                  document={document}
                  selectionOverlay={selectionOverlay}
                  linePreview={linePreview}
                  onPointerDown={onDraftPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                />
              </div>
            </section>
          ) : null}

          {isCorrectedVisible ? (
            <section className="panel canvas-panel">
              <div className="panel-title">
                <h2>{t('view.corrected')}</h2>
              </div>
              <div
                ref={correctedScrollRef}
                className="canvas-scroll"
                onScroll={(event) => onPaneScroll(event.currentTarget)}
              >
                <BeadPreviewCanvas
                  document={document}
                  variant="corrected"
                  onPointerDown={onPreviewPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                />
              </div>
            </section>
          ) : null}

          {isSimulationVisible ? (
            <section className="panel canvas-panel">
              <div className="panel-title">
                <h2>{t('view.simulation')}</h2>
              </div>
              <div
                ref={simulationScrollRef}
                className="canvas-scroll"
                onScroll={(event) => onPaneScroll(event.currentTarget)}
              >
                <BeadPreviewCanvas
                  document={document}
                  variant="simulation"
                  onPointerDown={onPreviewPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                />
              </div>
            </section>
          ) : null}

          {!hasAnyPaneVisible ? (
            <section className="panel empty-pane">
              <p>{t('view.selectAtLeastOne')}</p>
            </section>
          ) : null}
        </section>
      ) : null}

      {hasCanvasPaneVisible ? (
        <div className="shared-scrollbar-panel" aria-label={t('view.sharedPatternScroll')}>
          <input
            className="shared-scrollbar"
            type="range"
            min={0}
            max={sharedMaxScrollRow}
            step={1}
            value={Math.min(sharedScrollRow, sharedMaxScrollRow)}
            onChange={(event) => onSharedScrollChange(Number(event.currentTarget.value))}
          />
        </div>
      ) : null}

      {isReportVisible ? (
        <ReportPanel
          panelClassName="panel canvas-panel report-panel report-split-panel"
          reportSummary={reportSummary}
          visibleColorCounts={visibleColorCounts}
          colors={document.colors}
          colorToCss={colorToCss}
        />
      ) : null}
    </section>
  )
}
