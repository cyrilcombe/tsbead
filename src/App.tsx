import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from './domain/editorStore'
import { buildReportSummary } from './domain/report'
import { parseJbb, serializeJbb } from './io/jbb/format'
import { loadProject, saveProject } from './storage/db'
import { BeadCanvas } from './ui/canvas/BeadCanvas'
import { BeadPreviewCanvas } from './ui/canvas/BeadPreviewCanvas'
import type { CellPoint, SelectionRect, ToolId, ViewPaneId } from './domain/types'
import './index.css'

const LOCAL_PROJECT_ID = 'local-default'
const TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: 'pencil', label: 'Pencil' },
  { id: 'line', label: 'Line' },
  { id: 'fill', label: 'Fill' },
  { id: 'select', label: 'Select' },
]
const VIEW_PANES: Array<{ id: ViewPaneId; label: string }> = [
  { id: 'draft', label: 'Draft' },
  { id: 'corrected', label: 'Corrected' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'report', label: 'Report' },
]

function colorToCss(color: [number, number, number, number?]): string {
  const [red, green, blue, alpha = 255] = color
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}

function App() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const setCell = useEditorStore((state) => state.setCell)
  const drawLine = useEditorStore((state) => state.drawLine)
  const fillLine = useEditorStore((state) => state.fillLine)
  const reset = useEditorStore((state) => state.reset)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setViewVisibility = useEditorStore((state) => state.setViewVisibility)
  const setSelection = useEditorStore((state) => state.setSelection)
  const deleteSelection = useEditorStore((state) => state.deleteSelection)
  const mirrorHorizontal = useEditorStore((state) => state.mirrorHorizontal)
  const mirrorVertical = useEditorStore((state) => state.mirrorVertical)
  const rotateClockwise = useEditorStore((state) => state.rotateClockwise)
  const setDocument = useEditorStore((state) => state.setDocument)
  const dragStartRef = useRef<CellPoint | null>(null)
  const draftScrollRef = useRef<HTMLDivElement | null>(null)
  const correctedScrollRef = useRef<HTMLDivElement | null>(null)
  const simulationScrollRef = useRef<HTMLDivElement | null>(null)
  const syncingScrollRef = useRef(false)
  const [sharedScrollRatio, setSharedScrollRatio] = useState(0)
  const [viewportTick, setViewportTick] = useState(0)
  const [dragPreview, setDragPreview] = useState<SelectionRect | null>(null)

  useEffect(() => {
    void loadProject(LOCAL_PROJECT_ID).then((project) => {
      if (project) {
        setDocument(project.document)
      }
    })
  }, [setDocument])

  useEffect(() => {
    void saveProject({
      id: LOCAL_PROJECT_ID,
      name: 'Local Draft',
      updatedAt: Date.now(),
      document,
    })
  }, [document])

  const width = document.model.rows[0]?.length ?? 0
  const height = document.model.rows.length
  const selectedTool = document.view.selectedTool
  const selectedColor = document.view.selectedColor
  const isDraftVisible = document.view.draftVisible
  const isCorrectedVisible = document.view.correctedVisible
  const isSimulationVisible = document.view.simulationVisible
  const isReportVisible = document.view.reportVisible
  const hasCanvasPaneVisible = isDraftVisible || isCorrectedVisible || isSimulationVisible
  const hasAnyPaneVisible = hasCanvasPaneVisible || isReportVisible
  const canRotate =
    selection !== null &&
    Math.abs(selection.end.x - selection.start.x) === Math.abs(selection.end.y - selection.start.y)

  const selectionOverlay = useMemo(() => {
    if (selectedTool === 'select' && dragPreview) {
      return dragPreview
    }
    return selection
  }, [dragPreview, selectedTool, selection])

  const linePreview = useMemo(() => {
    if (selectedTool === 'line') {
      return dragPreview
    }
    return null
  }, [dragPreview, selectedTool])

  const reportSummary = useMemo(() => buildReportSummary(document, 'Local Draft'), [document])
  const visibleColorCounts = useMemo(
    () => reportSummary.colorCounts.filter((item) => item.count > 0),
    [reportSummary.colorCounts],
  )

  const onPointerDown = (point: CellPoint) => {
    dragStartRef.current = point
    if (selectedTool === 'line' || selectedTool === 'select') {
      setDragPreview({ start: point, end: point })
    } else {
      setDragPreview(null)
    }

    if (selectedTool === 'pencil') {
      setCell(point.x, point.y, selectedColor)
    } else if (selectedTool === 'fill') {
      fillLine(point, selectedColor)
    }
  }

  const onPointerMove = (point: CellPoint) => {
    const start = dragStartRef.current
    if (!start) {
      return
    }

    if (selectedTool === 'pencil') {
      setCell(point.x, point.y, selectedColor)
      return
    }

    if (selectedTool === 'line' || selectedTool === 'select') {
      setDragPreview({ start, end: point })
    }
  }

  const onPointerUp = (point: CellPoint) => {
    const start = dragStartRef.current
    dragStartRef.current = null

    if (!start) {
      setDragPreview(null)
      return
    }

    if (selectedTool === 'line') {
      drawLine(start, point, selectedColor)
    } else if (selectedTool === 'select') {
      setSelection({ start, end: point })
    }

    setDragPreview(null)
  }

  const onPointerCancel = () => {
    dragStartRef.current = null
    setDragPreview(null)
  }

  const onDeleteSelection = () => {
    dragStartRef.current = null
    setDragPreview(null)
    deleteSelection()
  }

  const paneVisibilityById: Record<ViewPaneId, boolean> = {
    draft: isDraftVisible,
    corrected: isCorrectedVisible,
    simulation: isSimulationVisible,
    report: isReportVisible,
  }

  const onPaneScroll = (source: HTMLDivElement) => {
    if (syncingScrollRef.current) {
      return
    }
    const sourceMax = source.scrollHeight - source.clientHeight
    const ratio = sourceMax > 0 ? source.scrollTop / sourceMax : 0
    setSharedScrollRatio(Math.max(0, Math.min(1, ratio)))
  }

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
    syncingScrollRef.current = true
    const paneRefs = [draftScrollRef.current, correctedScrollRef.current, simulationScrollRef.current]
    for (const pane of paneRefs) {
      if (!pane) {
        continue
      }
      const paneMax = pane.scrollHeight - pane.clientHeight
      pane.scrollTop = paneMax > 0 ? sharedScrollRatio * paneMax : 0
    }
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  }, [document.model.rows, document.view.zoom, sharedScrollRatio, viewportTick])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">JBead Modernization</p>
          <h1>jbead-web</h1>
          <p className="subtitle">Offline-first editor with .jbb compatibility.</p>
        </div>
        <div className="header-actions">
          <button className="action" onClick={() => reset()}>
            New canvas
          </button>
          <button
            className="action"
            onClick={() => {
              const content = serializeJbb(document)
              const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const link = window.document.createElement('a')
              link.href = url
              link.download = 'design.jbb'
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export .jbb
          </button>
          <label className="action file-input-label">
            Import .jbb
            <input
              type="file"
              accept=".jbb,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  return
                }
                void file.text().then((content) => {
                  const importedDocument = parseJbb(content)
                  setDocument(importedDocument)
                })
              }}
            />
          </label>
        </div>
      </header>

      <section className="panel tools-panel">
        <div className="tool-row">
          <div className="button-strip">
            {TOOLS.map((tool) => {
              const selected = selectedTool === tool.id
              return (
                <button
                  key={tool.id}
                  className={`action tool-action ${selected ? 'active' : ''}`}
                  onClick={() => setSelectedTool(tool.id)}
                >
                  {tool.label}
                </button>
              )
            })}
          </div>
          <div className="button-strip">
            <button className="action" onClick={() => mirrorHorizontal()}>
              Mirror H
            </button>
            <button className="action" onClick={() => mirrorVertical()}>
              Mirror V
            </button>
            <button className="action" onClick={() => rotateClockwise()} disabled={!canRotate}>
              Rotate 90
            </button>
            <button className="action" onClick={onDeleteSelection} disabled={selection === null}>
              Delete selection
            </button>
          </div>
        </div>
        <div className="view-row">
          <span className="view-row-label">Views</span>
          <div className="button-strip">
            {VIEW_PANES.map((pane) => {
              const visible = paneVisibilityById[pane.id]
              return (
                <button
                  key={pane.id}
                  className={`action view-toggle ${visible ? 'active' : ''}`}
                  aria-pressed={visible}
                  onClick={() => setViewVisibility(pane.id, !visible)}
                >
                  {pane.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <main className="workspace">
        <section className="preview-with-scrollbar">
          <section className="preview-grid">
            {isDraftVisible ? (
              <section className="panel canvas-panel draft-panel">
                <div className="panel-title">
                  <h2>Draft</h2>
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
                    onPointerDown={onPointerDown}
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
                  <h2>Corrected</h2>
                </div>
                <div
                  ref={correctedScrollRef}
                  className="canvas-scroll"
                  onScroll={(event) => onPaneScroll(event.currentTarget)}
                >
                  <BeadPreviewCanvas document={document} variant="corrected" />
                </div>
              </section>
            ) : null}

            {isSimulationVisible ? (
              <section className="panel canvas-panel">
                <div className="panel-title">
                  <h2>Simulation</h2>
                </div>
                <div
                  ref={simulationScrollRef}
                  className="canvas-scroll"
                  onScroll={(event) => onPaneScroll(event.currentTarget)}
                >
                  <BeadPreviewCanvas document={document} variant="simulation" />
                </div>
              </section>
            ) : null}

            {isReportVisible ? (
              <section className="panel report-panel">
                <div className="panel-title">
                  <h2>Report</h2>
                  <span>{reportSummary.usedColorCount} colors used</span>
                </div>
                <div className="report-content">
                  <dl className="report-info-list">
                    {reportSummary.entries.map((entry) => (
                      <div key={entry.label} className="report-info-row">
                        <dt>{entry.label}:</dt>
                        <dd>{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {reportSummary.repeat > 0 ? (
                    <section className="report-color-usage">
                      <h3>Color usage</h3>
                      <div className="report-color-grid">
                        {visibleColorCounts.map((item) => {
                          const color = document.colors[item.colorIndex]
                          const swatchStyle = color ? { backgroundColor: colorToCss(color) } : undefined
                          return (
                            <div key={item.colorIndex} className="report-color-row">
                              <span className="report-color-count">{item.count} x</span>
                              <span className="report-color-swatch" style={swatchStyle} />
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ) : null}
                </div>
              </section>
            ) : null}

            {!hasAnyPaneVisible ? (
              <section className="panel empty-pane">
                <p>Select at least one view to display a pane.</p>
              </section>
            ) : null}
          </section>

          {hasCanvasPaneVisible ? (
            <div className="shared-scrollbar-panel" aria-label="Shared pattern scroll">
              <input
                className="shared-scrollbar"
                type="range"
                min={0}
                max={1000}
                value={Math.round(sharedScrollRatio * 1000)}
                onChange={(event) => setSharedScrollRatio(Number(event.currentTarget.value) / 1000)}
              />
            </div>
          ) : null}
        </section>

        <aside className="panel sidebar">
          <div className="panel-title">
            <h2>Palette</h2>
            <span>{document.colors.length} colors</span>
          </div>
          <div className="palette-grid">
            {document.colors.map((color, index) => {
              const selected = document.view.selectedColor === index
              return (
                <button
                  key={`${color.join('-')}-${index}`}
                  className={`swatch ${selected ? 'selected' : ''}`}
                  style={{ backgroundColor: colorToCss(color) }}
                  onClick={() => setSelectedColor(index)}
                  title={`Color ${index}`}
                />
              )
            })}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
