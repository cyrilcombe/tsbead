import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from './domain/editorStore'
import { parseJbb, serializeJbb } from './io/jbb/format'
import { loadProject, saveProject } from './storage/db'
import { BeadCanvas } from './ui/canvas/BeadCanvas'
import type { CellPoint, SelectionRect, ToolId } from './domain/types'
import './index.css'

const LOCAL_PROJECT_ID = 'local-default'
const TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: 'pencil', label: 'Pencil' },
  { id: 'line', label: 'Line' },
  { id: 'fill', label: 'Fill' },
  { id: 'select', label: 'Select' },
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
  const setSelection = useEditorStore((state) => state.setSelection)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  const mirrorHorizontal = useEditorStore((state) => state.mirrorHorizontal)
  const mirrorVertical = useEditorStore((state) => state.mirrorVertical)
  const rotateClockwise = useEditorStore((state) => state.rotateClockwise)
  const setDocument = useEditorStore((state) => state.setDocument)
  const dragStartRef = useRef<CellPoint | null>(null)
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
            <button className="action" onClick={() => clearSelection()} disabled={selection === null}>
              Clear selection
            </button>
          </div>
        </div>
      </section>

      <main className="workspace">
        <section className="panel canvas-panel">
          <div className="panel-title">
            <h2>Pattern</h2>
            <span>
              {width} x {height}
            </span>
          </div>
          <div className="canvas-scroll">
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
