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

function getCellSize(zoomIndex: number): number {
  const zoomTable = [6, 8, 10, 12, 14, 16, 18, 20]
  return zoomTable[Math.max(0, Math.min(zoomIndex, zoomTable.length - 1))]
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName
  return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function colorFromKeyboardCode(code: string): number | null {
  if (code.startsWith('Digit')) {
    const value = Number(code.slice('Digit'.length))
    return Number.isInteger(value) && value >= 0 && value <= 9 ? value : null
  }
  if (code.startsWith('Numpad')) {
    const value = Number(code.slice('Numpad'.length))
    return Number.isInteger(value) && value >= 0 && value <= 9 ? value : null
  }
  return null
}

function shortcutFromKeyboardCode(code: string): number | null {
  if (code.startsWith('Digit')) {
    const value = Number(code.slice('Digit'.length))
    return Number.isInteger(value) && value >= 1 && value <= 9 ? value : null
  }
  if (code.startsWith('Numpad')) {
    const value = Number(code.slice('Numpad'.length))
    return Number.isInteger(value) && value >= 1 && value <= 9 ? value : null
  }
  return null
}

function App() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const setCell = useEditorStore((state) => state.setCell)
  const pickColorAt = useEditorStore((state) => state.pickColorAt)
  const drawLine = useEditorStore((state) => state.drawLine)
  const fillLine = useEditorStore((state) => state.fillLine)
  const reset = useEditorStore((state) => state.reset)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setViewVisibility = useEditorStore((state) => state.setViewVisibility)
  const setViewScroll = useEditorStore((state) => state.setViewScroll)
  const shiftLeft = useEditorStore((state) => state.shiftLeft)
  const shiftRight = useEditorStore((state) => state.shiftRight)
  const insertRow = useEditorStore((state) => state.insertRow)
  const deleteRow = useEditorStore((state) => state.deleteRow)
  const setSelection = useEditorStore((state) => state.setSelection)
  const deleteSelection = useEditorStore((state) => state.deleteSelection)
  const arrangeSelection = useEditorStore((state) => state.arrangeSelection)
  const mirrorHorizontal = useEditorStore((state) => state.mirrorHorizontal)
  const mirrorVertical = useEditorStore((state) => state.mirrorVertical)
  const rotateClockwise = useEditorStore((state) => state.rotateClockwise)
  const setDocument = useEditorStore((state) => state.setDocument)
  const dragStartRef = useRef<CellPoint | null>(null)
  const draftScrollRef = useRef<HTMLDivElement | null>(null)
  const correctedScrollRef = useRef<HTMLDivElement | null>(null)
  const simulationScrollRef = useRef<HTMLDivElement | null>(null)
  const syncingScrollRef = useRef(false)
  const [sharedMaxScrollRow, setSharedMaxScrollRow] = useState(0)
  const [viewportTick, setViewportTick] = useState(0)
  const [dragPreview, setDragPreview] = useState<SelectionRect | null>(null)
  const [isArrangeDialogOpen, setIsArrangeDialogOpen] = useState(false)
  const [arrangeCopies, setArrangeCopies] = useState('1')
  const [arrangeHorizontalOffset, setArrangeHorizontalOffset] = useState('0')
  const [arrangeVerticalOffset, setArrangeVerticalOffset] = useState('0')

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
  const cellSize = getCellSize(document.view.zoom)
  const selectedTool = document.view.selectedTool
  const selectedColor = document.view.selectedColor
  const sharedScrollRow = document.view.scroll
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

  const onPointerDown = (point: CellPoint, allowShapeTools: boolean) => {
    if ((selectedTool === 'line' || selectedTool === 'select') && !allowShapeTools) {
      dragStartRef.current = null
      setDragPreview(null)
      return
    }

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
    } else if (selectedTool === 'pipette') {
      pickColorAt(point)
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

  const onDraftPointerDown = (point: CellPoint) => onPointerDown(point, true)
  const onPreviewPointerDown = (point: CellPoint) => onPointerDown(point, false)

  const onDeleteSelection = () => {
    dragStartRef.current = null
    setDragPreview(null)
    deleteSelection()
  }

  const parseArrangeValue = (rawValue: string, fallback: number): number => {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
      return fallback
    }
    return Math.max(0, Math.min(100, Math.floor(parsed)))
  }

  const onOpenArrangeDialog = () => {
    if (selection === null || width <= 0) {
      return
    }

    const selectionWidth = Math.abs(selection.end.x - selection.start.x) + 1
    const selectionHeight = Math.abs(selection.end.y - selection.start.y) + 1
    const defaultHorizontalOffset = selectionWidth === width ? 0 : selectionWidth

    setArrangeCopies('1')
    setArrangeHorizontalOffset(String(defaultHorizontalOffset))
    setArrangeVerticalOffset(String(selectionHeight))
    setIsArrangeDialogOpen(true)
  }

  const onApplyArrange = () => {
    const copies = parseArrangeValue(arrangeCopies, 1)
    const horizontalOffset = parseArrangeValue(arrangeHorizontalOffset, 0)
    const verticalOffset = parseArrangeValue(arrangeVerticalOffset, 0)
    arrangeSelection(copies, horizontalOffset, verticalOffset)
    setIsArrangeDialogOpen(false)
  }

  const paneVisibilityById: Record<ViewPaneId, boolean> = {
    draft: isDraftVisible,
    corrected: isCorrectedVisible,
    simulation: isSimulationVisible,
    report: isReportVisible,
  }

  const getPaneMaxScrollTop = (pane: HTMLDivElement | null): number => {
    if (!pane) {
      return 0
    }
    return Math.max(0, pane.scrollHeight - pane.clientHeight)
  }

  const getPaneMaxScrollRow = (pane: HTMLDivElement | null): number => {
    const maxScrollTop = getPaneMaxScrollTop(pane)
    return Math.max(0, Math.ceil(maxScrollTop / cellSize))
  }

  const getSharedMaxRow = (): number => {
    const referencePane =
      (isDraftVisible ? draftScrollRef.current : null) ??
      (isCorrectedVisible ? correctedScrollRef.current : null) ??
      (isSimulationVisible ? simulationScrollRef.current : null)
    if (!referencePane) {
      return Math.max(0, height - 1)
    }
    return getPaneMaxScrollRow(referencePane)
  }

  const onPaneScroll = (source: HTMLDivElement) => {
    if (syncingScrollRef.current) {
      return
    }
    const maxScrollTop = getPaneMaxScrollTop(source)
    const sourceMaxRow = getPaneMaxScrollRow(source)
    const sourceScrollRow = source.scrollTop >= maxScrollTop - 1 ? sourceMaxRow : Math.round(source.scrollTop / cellSize)
    const nextScrollRow = Math.max(0, Math.min(sourceMaxRow, sourceScrollRow))
    setViewScroll(nextScrollRow)
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (isArrangeDialogOpen) {
        if (event.key === 'Escape') {
          setIsArrangeDialogOpen(false)
          event.preventDefault()
        }
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      const hasModifier = event.ctrlKey || event.metaKey
      let handled = false

      if (hasModifier && !event.altKey) {
        const shortcut = shortcutFromKeyboardCode(event.code)
        if (shortcut === 1) {
          setSelectedTool('pencil')
          handled = true
        } else if (shortcut === 2) {
          setSelectedTool('line')
          handled = true
        } else if (shortcut === 3) {
          setSelectedTool('fill')
          handled = true
        } else if (shortcut === 4) {
          setSelectedTool('select')
          handled = true
        } else if (shortcut === 5) {
          onDeleteSelection()
          handled = true
        } else if (shortcut === 6) {
          setSelectedTool('pipette')
          handled = true
        }
      } else if (!event.altKey) {
        const colorFromCode = colorFromKeyboardCode(event.code)
        if (colorFromCode !== null) {
          setSelectedColor(colorFromCode)
          handled = true
        } else if (event.key >= '0' && event.key <= '9') {
          setSelectedColor(Number(event.key))
          handled = true
        } else if (event.key === 'ArrowLeft') {
          shiftLeft()
          handled = true
        } else if (event.key === 'ArrowRight') {
          shiftRight()
          handled = true
        }
      }

      if (handled) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isArrangeDialogOpen, onDeleteSelection, setSelectedColor, setSelectedTool, shiftLeft, shiftRight])

  useEffect(() => {
    const nextSharedMaxRow = getSharedMaxRow()
    setSharedMaxScrollRow((current) => (current === nextSharedMaxRow ? current : nextSharedMaxRow))

    const targetScrollRow = Math.max(0, Math.min(nextSharedMaxRow, sharedScrollRow))
    if (targetScrollRow !== sharedScrollRow) {
      setViewScroll(targetScrollRow)
      return
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
      pane.scrollTop = paneTargetRow >= paneMaxRow ? paneMaxScrollTop : paneTargetRow * cellSize
    }
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  }, [
    cellSize,
    document.model.rows,
    isCorrectedVisible,
    isDraftVisible,
    isSimulationVisible,
    sharedScrollRow,
    viewportTick,
    setViewScroll,
  ])

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
            <button className="action" onClick={onDeleteSelection} disabled={selection === null}>
              Delete selection
            </button>
            <button
              className={`action tool-action ${selectedTool === 'pipette' ? 'active' : ''}`}
              onClick={() => setSelectedTool('pipette')}
            >
              Pipette
            </button>
          </div>
          <div className="button-strip">
            <button className="action" onClick={() => shiftLeft()} title="ArrowLeft">
              Shift left
            </button>
            <button className="action" onClick={() => shiftRight()} title="ArrowRight">
              Shift right
            </button>
            <button className="action" onClick={() => insertRow()}>
              Insert row
            </button>
            <button className="action" onClick={() => deleteRow()}>
              Delete row
            </button>
            <button className="action" onClick={onOpenArrangeDialog} disabled={selection === null}>
              Arrange...
            </button>
            <button className="action" onClick={() => mirrorHorizontal()}>
              Mirror H
            </button>
            <button className="action" onClick={() => mirrorVertical()}>
              Mirror V
            </button>
            <button className="action" onClick={() => rotateClockwise()} disabled={!canRotate}>
              Rotate 90
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
                  <h2>Corrected</h2>
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
                  <h2>Simulation</h2>
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

            {isReportVisible ? (
              <section className="panel canvas-panel report-panel">
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
                  {reportSummary.beadRuns.length > 0 ? (
                    <section className="report-bead-list">
                      <h3>List of beads</h3>
                      <div className="report-bead-grid">
                        {reportSummary.beadRuns.map((item, index) => {
                          const color = document.colors[item.colorIndex]
                          const swatchStyle = color ? { backgroundColor: colorToCss(color) } : undefined
                          return (
                            <div key={`${item.colorIndex}-${item.count}-${index}`} className="report-bead-row">
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
                max={sharedMaxScrollRow}
                step={1}
                value={Math.min(sharedScrollRow, sharedMaxScrollRow)}
                onChange={(event) => setViewScroll(Number(event.currentTarget.value))}
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

      {isArrangeDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Arrange selection">
            <div className="panel-title">
              <h2>Arrange Selection</h2>
            </div>
            <div className="arrange-form">
              <label className="arrange-field">
                Horizontal offset
                <input
                  className="arrange-input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={arrangeHorizontalOffset}
                  onChange={(event) => setArrangeHorizontalOffset(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Vertical offset
                <input
                  className="arrange-input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={arrangeVerticalOffset}
                  onChange={(event) => setArrangeVerticalOffset(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Copies
                <input
                  className="arrange-input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={arrangeCopies}
                  onChange={(event) => setArrangeCopies(event.currentTarget.value)}
                />
              </label>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsArrangeDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={onApplyArrange}>
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
