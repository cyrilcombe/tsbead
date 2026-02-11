import type { ColorCount, ReportSummary } from '../../domain/report'
import type { JBeadDocument, RgbaColor } from '../../domain/types'

interface ReportPanelProps {
  panelClassName: string
  reportSummary: ReportSummary
  visibleColorCounts: ColorCount[]
  colors: JBeadDocument['colors']
  colorToCss: (color: RgbaColor) => string
  keyPrefix?: string
}

export function ReportPanel({
  panelClassName,
  reportSummary,
  visibleColorCounts,
  colors,
  colorToCss,
  keyPrefix = '',
}: ReportPanelProps) {
  return (
    <section className={panelClassName}>
      <div className="panel-title">
        <h2>Report</h2>
      </div>
      <div className="report-content">
        <dl className="report-info-list">
          {reportSummary.entries.map((entry) => (
            <div key={`${keyPrefix}${entry.label}`} className="report-info-row">
              <dt>{entry.label}:</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
        {reportSummary.repeat > 0 ? (
          <section className="report-color-usage">
            <div className="report-color-grid">
              {visibleColorCounts.map((item) => {
                const color = colors[item.colorIndex]
                const swatchStyle = color ? { backgroundColor: colorToCss(color) } : undefined
                return (
                  <div key={`${keyPrefix}${item.colorIndex}`} className="report-color-row">
                    <span className="report-color-count">{item.count} x</span>
                    <span className="report-color-swatch" style={swatchStyle} />
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
        {reportSummary.beadRuns.length > 0 ? (
          <section className="report-bead-list">
            <h3>List of beads</h3>
            <div className="report-bead-grid">
              {reportSummary.beadRuns.map((item, index) => {
                const color = colors[item.colorIndex]
                const swatchStyle = color ? { backgroundColor: colorToCss(color) } : undefined
                return (
                  <div key={`${keyPrefix}${item.colorIndex}-${item.count}-${index}`} className="report-bead-row">
                    <span className="report-color-swatch" style={swatchStyle} />
                    <span className="report-bead-count">{item.count}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )
}
