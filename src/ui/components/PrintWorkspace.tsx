import type { ColorCount, ReportSummary } from '../../domain/report'
import type { JBeadDocument, RgbaColor } from '../../domain/types'
import { useI18n } from '../../i18n/I18nProvider'
import { BeadCanvas } from '../canvas/BeadCanvas'
import { BeadPreviewCanvas } from '../canvas/BeadPreviewCanvas'
import { ReportPanel } from './ReportPanel'

interface PrintChunk {
  start: number
  end: number
}

interface PrintWorkspaceProps {
  isReportVisible: boolean
  isDraftVisible: boolean
  isCorrectedVisible: boolean
  isSimulationVisible: boolean
  height: number
  printChunks: PrintChunk[]
  document: JBeadDocument
  reportSummary: ReportSummary
  visibleColorCounts: ColorCount[]
  colorToCss: (color: RgbaColor) => string
  formatChunkLabel: (totalRows: number, rowStart: number, rowEndExclusive: number) => string
}

export function PrintWorkspace({
  isReportVisible,
  isDraftVisible,
  isCorrectedVisible,
  isSimulationVisible,
  height,
  printChunks,
  document,
  reportSummary,
  visibleColorCounts,
  colorToCss,
  formatChunkLabel,
}: PrintWorkspaceProps) {
  const { t } = useI18n()

  return (
    <section className={`print-workspace ${isReportVisible ? 'has-report' : 'no-report'}`} aria-hidden="true">
      {isReportVisible ? (
        <ReportPanel
          panelClassName="panel canvas-panel report-panel print-report-panel"
          reportSummary={reportSummary}
          visibleColorCounts={visibleColorCounts}
          colors={document.colors}
          colorToCss={colorToCss}
          keyPrefix="print-"
        />
      ) : null}

      {isDraftVisible
        ? printChunks.map((chunk) => {
            const chunkLabel = formatChunkLabel(height, chunk.start, chunk.end)
            return (
              <section key={`print-draft-${chunk.start}-${chunk.end}`} className="panel canvas-panel draft-panel print-panel">
                <div className="panel-title">
                  <h2>{t('view.draft')}</h2>
                  <span>{t('report.rows', { value: chunkLabel })}</span>
                </div>
                <div className="canvas-scroll">
                  <BeadCanvas
                    document={document}
                    selectionOverlay={null}
                    linePreview={null}
                    rowStart={chunk.start}
                    rowEndExclusive={chunk.end}
                  />
                </div>
              </section>
            )
          })
        : null}

      {isCorrectedVisible
        ? printChunks.map((chunk) => {
            const chunkLabel = formatChunkLabel(height, chunk.start, chunk.end)
            return (
              <section key={`print-corrected-${chunk.start}-${chunk.end}`} className="panel canvas-panel print-panel">
                <div className="panel-title">
                  <h2>{t('view.corrected')}</h2>
                  <span>{t('report.rows', { value: chunkLabel })}</span>
                </div>
                <div className="canvas-scroll">
                  <BeadPreviewCanvas document={document} variant="corrected" rowStart={chunk.start} rowEndExclusive={chunk.end} />
                </div>
              </section>
            )
          })
        : null}

      {isSimulationVisible
        ? printChunks.map((chunk) => {
            const chunkLabel = formatChunkLabel(height, chunk.start, chunk.end)
            return (
              <section key={`print-simulation-${chunk.start}-${chunk.end}`} className="panel canvas-panel print-panel">
                <div className="panel-title">
                  <h2>{t('view.simulation')}</h2>
                  <span>{t('report.rows', { value: chunkLabel })}</span>
                </div>
                <div className="canvas-scroll">
                  <BeadPreviewCanvas document={document} variant="simulation" rowStart={chunk.start} rowEndExclusive={chunk.end} />
                </div>
              </section>
            )
          })
        : null}
    </section>
  )
}
