import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useEditorStore } from './domain/editorStore'
import { buildReportSummary } from './domain/report'
import { parseJbb, serializeJbb } from './io/jbb/format'
import {
  deleteRecentFile,
  listRecentFiles,
  loadProject,
  type RecentFileRecord,
  saveProject,
  saveRecentFile,
} from './storage/db'
import { BeadCanvas } from './ui/canvas/BeadCanvas'
import { BeadPreviewCanvas } from './ui/canvas/BeadPreviewCanvas'
import type { CellPoint, JBeadDocument, SelectionRect, ToolId, ViewPaneId } from './domain/types'
import './index.css'

const LOCAL_PROJECT_ID = 'local-default'
const LOCAL_PROJECT_NAME = 'Local Draft'
const DEFAULT_FILE_NAME = 'design.jbb'
const JBB_FILE_PICKER_ACCEPT = { 'text/plain': ['.jbb'] }
const RECENT_FILES_LIMIT = 8
const PRINT_CHUNK_SIZE = 100
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
const MIN_PATTERN_WIDTH = 5
const MAX_PATTERN_WIDTH = 500
const MIN_PATTERN_HEIGHT = 5
const MAX_PATTERN_HEIGHT = 10000
const ZOOM_TABLE = [6, 8, 10, 12, 14, 16, 18, 20]

interface FileSystemWritableStreamLike {
  write: (data: string | Blob) => Promise<void>
  close: () => Promise<void>
}

interface FileSystemFileHandleLike {
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<FileSystemWritableStreamLike>
}

interface WindowWithFilePicker extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
    excludeAcceptAllOption?: boolean
  }) => Promise<FileSystemFileHandleLike[]>
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
    excludeAcceptAllOption?: boolean
  }) => Promise<FileSystemFileHandleLike>
}

function colorToCss(color: [number, number, number, number?]): string {
  const [red, green, blue, alpha = 255] = color
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}

function colorToHex(color: [number, number, number, number?]): string {
  const [red, green, blue] = color
  const toHex = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function hexToRgb(value: string): [number, number, number] | null {
  const hex = value.startsWith('#') ? value.slice(1) : value
  if (!/^[\da-fA-F]{6}$/.test(hex)) {
    return null
  }
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function getCellSize(zoomIndex: number): number {
  return ZOOM_TABLE[Math.max(0, Math.min(zoomIndex, ZOOM_TABLE.length - 1))]
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

function ensureJbbFileName(fileName: string): string {
  const trimmed = fileName.trim()
  if (trimmed.length === 0) {
    return DEFAULT_FILE_NAME
  }
  return trimmed.toLowerCase().endsWith('.jbb') ? trimmed : `${trimmed}.jbb`
}

function createJbbBlob(document: JBeadDocument): Blob {
  const content = serializeJbb(document)
  return new Blob([content], { type: 'text/plain;charset=utf-8' })
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected error'
}

function formatRecentTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatLegacyChunkLabel(totalRows: number, rowStart: number, rowEndExclusive: number): string {
  const low = Math.max(1, totalRows - rowEndExclusive + 1)
  const high = Math.max(low, totalRows - rowStart)
  return `${low}-${high}`
}

function App() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const setCell = useEditorStore((state) => state.setCell)
  const pickColorAt = useEditorStore((state) => state.pickColorAt)
  const drawLine = useEditorStore((state) => state.drawLine)
  const fillLine = useEditorStore((state) => state.fillLine)
  const reset = useEditorStore((state) => state.reset)
  const setMetadata = useEditorStore((state) => state.setMetadata)
  const setPaletteColor = useEditorStore((state) => state.setPaletteColor)
  const setColorAsBackground = useEditorStore((state) => state.setColorAsBackground)
  const setSelectedColor = useEditorStore((state) => state.setSelectedColor)
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool)
  const setViewVisibility = useEditorStore((state) => state.setViewVisibility)
  const setViewScroll = useEditorStore((state) => state.setViewScroll)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setDrawColors = useEditorStore((state) => state.setDrawColors)
  const setDrawSymbols = useEditorStore((state) => state.setDrawSymbols)
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)
  const shiftLeft = useEditorStore((state) => state.shiftLeft)
  const shiftRight = useEditorStore((state) => state.shiftRight)
  const setPatternWidth = useEditorStore((state) => state.setPatternWidth)
  const setPatternHeight = useEditorStore((state) => state.setPatternHeight)
  const insertRow = useEditorStore((state) => state.insertRow)
  const deleteRow = useEditorStore((state) => state.deleteRow)
  const setSelection = useEditorStore((state) => state.setSelection)
  const deleteSelection = useEditorStore((state) => state.deleteSelection)
  const arrangeSelection = useEditorStore((state) => state.arrangeSelection)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const dirty = useEditorStore((state) => state.dirty)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const mirrorHorizontal = useEditorStore((state) => state.mirrorHorizontal)
  const mirrorVertical = useEditorStore((state) => state.mirrorVertical)
  const rotateClockwise = useEditorStore((state) => state.rotateClockwise)
  const markSaved = useEditorStore((state) => state.markSaved)
  const setDocument = useEditorStore((state) => state.setDocument)
  const paletteColorPickerRef = useRef<HTMLInputElement | null>(null)
  const openFileInputRef = useRef<HTMLInputElement | null>(null)
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
  const [isPatternWidthDialogOpen, setIsPatternWidthDialogOpen] = useState(false)
  const [isPatternHeightDialogOpen, setIsPatternHeightDialogOpen] = useState(false)
  const [patternWidthInput, setPatternWidthInput] = useState('15')
  const [patternHeightInput, setPatternHeightInput] = useState('120')
  const [isZoomFitMode, setIsZoomFitMode] = useState(false)
  const [editingPaletteColorIndex, setEditingPaletteColorIndex] = useState<number | null>(null)
  const [openFileName, setOpenFileName] = useState(DEFAULT_FILE_NAME)
  const [openFileHandle, setOpenFileHandle] = useState<FileSystemFileHandleLike | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([])
  const [isRecentDialogOpen, setIsRecentDialogOpen] = useState(false)

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
      name: LOCAL_PROJECT_NAME,
      updatedAt: Date.now(),
      document,
    })
  }, [document])

  const refreshRecentFiles = useCallback(async () => {
    const files = await listRecentFiles(RECENT_FILES_LIMIT)
    setRecentFiles(files)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void refreshRecentFiles()
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [refreshRecentFiles])

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
  const drawColors = document.view.drawColors
  const drawSymbols = document.view.drawSymbols
  const zoomIndex = document.view.zoom
  const canZoomIn = zoomIndex < 7
  const canZoomOut = zoomIndex > 0
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

  const reportSummary = useMemo(() => buildReportSummary(document, openFileName), [document, openFileName])
  const visibleColorCounts = useMemo(
    () => reportSummary.colorCounts.filter((item) => item.count > 0),
    [reportSummary.colorCounts],
  )
  const printChunks = useMemo(() => {
    const chunks: Array<{ start: number; end: number }> = []
    for (let start = 0; start < height; start += PRINT_CHUNK_SIZE) {
      chunks.push({ start, end: Math.min(height, start + PRINT_CHUNK_SIZE) })
    }
    return chunks
  }, [height])

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

  const onDeleteSelection = useCallback(() => {
    dragStartRef.current = null
    setDragPreview(null)
    deleteSelection()
  }, [deleteSelection])

  const parseArrangeValue = (rawValue: string, fallback: number): number => {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
      return fallback
    }
    return Math.max(0, Math.min(100, Math.floor(parsed)))
  }

  const parsePatternDimensionValue = (
    rawValue: string,
    fallback: number,
    min: number,
    max: number,
  ): number => {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
      return fallback
    }
    return Math.max(min, Math.min(max, Math.floor(parsed)))
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

  const onOpenPatternWidthDialog = () => {
    setPatternWidthInput(String(width))
    setIsPatternWidthDialogOpen(true)
  }

  const onOpenPatternHeightDialog = () => {
    setPatternHeightInput(String(height))
    setIsPatternHeightDialogOpen(true)
  }

  const onApplyPatternWidth = () => {
    const nextWidth = parsePatternDimensionValue(
      patternWidthInput,
      width,
      MIN_PATTERN_WIDTH,
      MAX_PATTERN_WIDTH,
    )
    setPatternWidth(nextWidth)
    setIsPatternWidthDialogOpen(false)
  }

  const onApplyPatternHeight = () => {
    const nextHeight = parsePatternDimensionValue(
      patternHeightInput,
      height,
      MIN_PATTERN_HEIGHT,
      MAX_PATTERN_HEIGHT,
    )
    setPatternHeight(nextHeight)
    setIsPatternHeightDialogOpen(false)
  }

  const onEditPaletteColor = (index: number) => {
    if (index < 0 || index >= document.colors.length) {
      return
    }
    setEditingPaletteColorIndex(index)
    requestAnimationFrame(() => {
      paletteColorPickerRef.current?.click()
    })
  }

  const onPaletteColorPicked = (value: string) => {
    if (editingPaletteColorIndex === null) {
      return
    }
    const rgb = hexToRgb(value)
    if (!rgb) {
      return
    }
    setPaletteColor(editingPaletteColorIndex, [rgb[0], rgb[1], rgb[2], 255])
  }

  const onDownloadFile = useCallback(
    (fileName: string) => {
      const blob = createJbbBlob(document)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = ensureJbbFileName(fileName)
      link.click()
      URL.revokeObjectURL(url)
    },
    [document],
  )

  const onLoadFile = useCallback(
    async (file: File, handle: FileSystemFileHandleLike | null) => {
      try {
        const content = await file.text()
        const importedDocument = parseJbb(content)
        const normalizedName = ensureJbbFileName(file.name)
        setDocument(importedDocument)
        setOpenFileHandle(handle)
        setOpenFileName(normalizedName)
        await saveRecentFile(normalizedName, content)
        await refreshRecentFiles()
      } catch (error) {
        window.alert(`Could not open file: ${getErrorMessage(error)}`)
      }
    },
    [refreshRecentFiles, setDocument],
  )

  const onDiscardUnsavedChanges = useCallback((): boolean => {
    if (!dirty) {
      return true
    }
    return window.confirm('There are unsaved changes. Continue and discard them?')
  }, [dirty])

  const onNewDocument = useCallback((): boolean => {
    if (!onDiscardUnsavedChanges()) {
      return false
    }
    reset()
    setOpenFileHandle(null)
    setOpenFileName(DEFAULT_FILE_NAME)
    return true
  }, [onDiscardUnsavedChanges, reset])

  const onOpenDocument = useCallback(async (): Promise<void> => {
    if (!onDiscardUnsavedChanges()) {
      return
    }

    const pickerWindow = window as WindowWithFilePicker
    if (pickerWindow.showOpenFilePicker) {
      try {
        const handles = await pickerWindow.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'JBead files', accept: JBB_FILE_PICKER_ACCEPT }],
          excludeAcceptAllOption: false,
        })
        const handle = handles[0]
        if (!handle) {
          return
        }
        const file = await handle.getFile()
        await onLoadFile(file, handle)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        window.alert(`Could not open file: ${getErrorMessage(error)}`)
      }
      return
    }

    openFileInputRef.current?.click()
  }, [onDiscardUnsavedChanges, onLoadFile])

  const onSaveAsDocument = useCallback(async (): Promise<boolean> => {
    const targetFileName = ensureJbbFileName(openFileName)
    const serializedContent = serializeJbb(document)
    const pickerWindow = window as WindowWithFilePicker
    if (pickerWindow.showSaveFilePicker) {
      try {
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: targetFileName,
          types: [{ description: 'JBead files', accept: JBB_FILE_PICKER_ACCEPT }],
          excludeAcceptAllOption: false,
        })
        const writable = await handle.createWritable()
        await writable.write(serializedContent)
        await writable.close()
        const normalizedName = ensureJbbFileName(handle.name)
        setOpenFileHandle(handle)
        setOpenFileName(normalizedName)
        await saveRecentFile(normalizedName, serializedContent)
        await refreshRecentFiles()
        markSaved()
        return true
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return false
        }
        window.alert(`Could not save file: ${getErrorMessage(error)}`)
        return false
      }
    }

    onDownloadFile(targetFileName)
    setOpenFileHandle(null)
    setOpenFileName(targetFileName)
    await saveRecentFile(targetFileName, serializedContent)
    await refreshRecentFiles()
    markSaved()
    return true
  }, [document, markSaved, onDownloadFile, openFileName, refreshRecentFiles])

  const onSaveDocument = useCallback(async (): Promise<boolean> => {
    if (!openFileHandle) {
      return onSaveAsDocument()
    }

    try {
      const serializedContent = serializeJbb(document)
      const writable = await openFileHandle.createWritable()
      await writable.write(serializedContent)
      await writable.close()
      await saveRecentFile(openFileName, serializedContent)
      await refreshRecentFiles()
      markSaved()
      return true
    } catch (error) {
      window.alert(`Could not save file: ${getErrorMessage(error)}`)
      return false
    }
  }, [document, markSaved, onSaveAsDocument, openFileHandle, openFileName, refreshRecentFiles])

  const onPrintDocument = useCallback(() => {
    window.print()
  }, [])

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) {
      return
    }
    void onLoadFile(file, null)
  }

  const onOpenRecentDialog = useCallback(() => {
    void refreshRecentFiles()
    setIsRecentDialogOpen(true)
  }, [refreshRecentFiles])

  const onOpenRecentFile = useCallback(
    async (entry: RecentFileRecord) => {
      if (!onDiscardUnsavedChanges()) {
        return
      }
      try {
        const importedDocument = parseJbb(entry.content)
        setDocument(importedDocument)
        setOpenFileHandle(null)
        setOpenFileName(entry.name)
        await saveRecentFile(entry.name, entry.content)
        await refreshRecentFiles()
        setIsRecentDialogOpen(false)
      } catch (error) {
        await deleteRecentFile(entry.id)
        await refreshRecentFiles()
        window.alert(`Could not open recent file: ${getErrorMessage(error)}`)
      }
    },
    [onDiscardUnsavedChanges, refreshRecentFiles, setDocument],
  )

  const onDeleteRecentEntry = useCallback(async (entryId: string) => {
    await deleteRecentFile(entryId)
    await refreshRecentFiles()
  }, [refreshRecentFiles])

  const paneVisibilityById: Record<ViewPaneId, boolean> = {
    draft: isDraftVisible,
    corrected: isCorrectedVisible,
    simulation: isSimulationVisible,
    report: isReportVisible,
  }

  const getPaneMaxScrollTop = useCallback((pane: HTMLDivElement | null): number => {
    if (!pane) {
      return 0
    }
    return Math.max(0, pane.scrollHeight - pane.clientHeight)
  }, [])

  const getPaneMaxScrollRow = useCallback(
    (pane: HTMLDivElement | null): number => {
      const maxScrollTop = getPaneMaxScrollTop(pane)
      return Math.max(0, Math.ceil(maxScrollTop / cellSize))
    },
    [cellSize, getPaneMaxScrollTop],
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
    document.model.rows,
    document.view.shift,
    isCorrectedVisible,
    isDraftVisible,
    isReportVisible,
    isSimulationVisible,
    isZoomFitMode,
    viewportTick,
  ])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isRecentDialogOpen || isArrangeDialogOpen || isPatternWidthDialogOpen || isPatternHeightDialogOpen) {
        if (event.key === 'Escape') {
          setIsRecentDialogOpen(false)
          setIsArrangeDialogOpen(false)
          setIsPatternWidthDialogOpen(false)
          setIsPatternHeightDialogOpen(false)
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
        const lowerKey = event.key.toLowerCase()
        if (lowerKey === 'z') {
          if (event.shiftKey) {
            redo()
          } else {
            undo()
          }
          handled = true
        } else if (lowerKey === 'y') {
          redo()
          handled = true
        } else if (lowerKey === 'p' && !event.shiftKey) {
          onPrintDocument()
          handled = true
        } else if (lowerKey === 'n' && !event.shiftKey) {
          onNewDocument()
          handled = true
        } else if (lowerKey === 'o') {
          if (event.shiftKey) {
            onOpenRecentDialog()
          } else {
            void onOpenDocument()
          }
          handled = true
        } else if (lowerKey === 's') {
          if (event.shiftKey) {
            void onSaveAsDocument()
          } else {
            void onSaveDocument()
          }
          handled = true
        } else {
          const shortcut = shortcutFromKeyboardCode(event.code)
          if (shortcut === 1 && !event.shiftKey) {
            setSelectedTool('pencil')
            handled = true
          } else if (shortcut === 2 && !event.shiftKey) {
            setSelectedTool('line')
            handled = true
          } else if (shortcut === 3 && !event.shiftKey) {
            setSelectedTool('fill')
            handled = true
          } else if (shortcut === 4 && !event.shiftKey) {
            setSelectedTool('select')
            handled = true
          } else if (shortcut === 5 && !event.shiftKey) {
            onDeleteSelection()
            handled = true
          } else if (shortcut === 6 && !event.shiftKey) {
            setSelectedTool('pipette')
            handled = true
          }
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
  }, [
    isArrangeDialogOpen,
    isRecentDialogOpen,
    isPatternHeightDialogOpen,
    isPatternWidthDialogOpen,
    onDeleteSelection,
    onNewDocument,
    onOpenDocument,
    onOpenRecentDialog,
    onPrintDocument,
    onSaveAsDocument,
    onSaveDocument,
    redo,
    setSelectedColor,
    setSelectedTool,
    shiftLeft,
    shiftRight,
    undo,
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
      pane.scrollTop = paneTargetRow >= paneMaxRow ? paneMaxScrollTop : paneTargetRow * cellSize
    }
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [
    cellSize,
    document.model.rows,
    getPaneMaxScrollRow,
    getPaneMaxScrollTop,
    getSharedMaxRow,
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
        <div className="header-copy">
          <p className="eyebrow">JBead Modernization</p>
          <h1>jbead-web</h1>
          <p className="subtitle">Offline-first editor with .jbb compatibility.</p>
          <p className="file-status">
            File: <strong>{openFileName}</strong>
            {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
          </p>
        </div>
        <div className="header-actions">
          <button className="action" onClick={onNewDocument}>
            New
          </button>
          <button className="action" onClick={() => void onOpenDocument()}>
            Open...
          </button>
          <button className="action" onClick={onOpenRecentDialog} disabled={recentFiles.length === 0}>
            Open recent...
          </button>
          <button className="action" onClick={() => void onSaveDocument()}>
            Save
          </button>
          <button className="action" onClick={() => void onSaveAsDocument()}>
            Save As...
          </button>
          <button
            className="action"
            onClick={() => {
              onDownloadFile(openFileName)
            }}
          >
            Export .jbb
          </button>
          <button className="action" onClick={onPrintDocument} disabled={!hasAnyPaneVisible}>
            Print...
          </button>
          <input ref={openFileInputRef} className="hidden-file-input" type="file" accept=".jbb,text/plain" onChange={onFileInputChange} />
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
            <button className="action" onClick={() => undo()} disabled={!canUndo}>
              Undo
            </button>
            <button className="action" onClick={() => redo()} disabled={!canRedo}>
              Redo
            </button>
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
            <button className="action" onClick={onOpenPatternWidthDialog}>
              Pattern width...
            </button>
            <button className="action" onClick={onOpenPatternHeightDialog}>
              Pattern height...
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
        <div className="view-row">
          <span className="view-row-label">Display</span>
          <div className="button-strip">
            <button
              className="action"
              onClick={() => {
                setIsZoomFitMode(false)
                zoomOut()
              }}
              disabled={!canZoomOut}
            >
              Zoom -
            </button>
            <button
              className={`action ${isZoomFitMode ? 'view-toggle active' : ''}`}
              onClick={() => {
                setIsZoomFitMode(true)
                applyZoomFit()
              }}
              disabled={!hasCanvasPaneVisible}
            >
              Zoom 100%
            </button>
            <button
              className="action"
              onClick={() => {
                setIsZoomFitMode(false)
                zoomIn()
              }}
              disabled={!canZoomIn}
            >
              Zoom +
            </button>
            <button
              className={`action view-toggle ${drawColors ? 'active' : ''}`}
              aria-pressed={drawColors}
              onClick={() => setDrawColors(!drawColors)}
            >
              Draw colors
            </button>
            <button
              className={`action view-toggle ${drawSymbols ? 'active' : ''}`}
              aria-pressed={drawSymbols}
              onClick={() => setDrawSymbols(!drawSymbols)}
            >
              Draw symbols
            </button>
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
          <div className="palette-actions">
            <button
              className="action"
              onClick={() => onEditPaletteColor(selectedColor)}
              disabled={selectedColor < 0 || selectedColor >= document.colors.length}
            >
              Edit color...
            </button>
            <button className="action" onClick={() => setColorAsBackground(selectedColor)} disabled={selectedColor === 0}>
              As background
            </button>
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
                  onDoubleClick={() => onEditPaletteColor(index)}
                  title={`Color ${index}`}
                />
              )
            })}
          </div>
          <input
            ref={paletteColorPickerRef}
            className="palette-color-picker"
            type="color"
            value={colorToHex(
              document.colors[editingPaletteColorIndex ?? selectedColor] ?? document.colors[0] ?? [0, 0, 0, 255],
            )}
            onChange={(event) => onPaletteColorPicked(event.currentTarget.value)}
            onBlur={() => setEditingPaletteColorIndex(null)}
          />
          <section className="metadata-section">
            <div className="panel-title">
              <h2>Metadata</h2>
            </div>
            <label className="metadata-field">
              Author
              <input
                className="metadata-input"
                type="text"
                value={document.author}
                onChange={(event) => setMetadata({ author: event.currentTarget.value })}
              />
            </label>
            <label className="metadata-field">
              Organization
              <input
                className="metadata-input"
                type="text"
                value={document.organization}
                onChange={(event) => setMetadata({ organization: event.currentTarget.value })}
              />
            </label>
            <label className="metadata-field">
              Notes
              <textarea
                className="metadata-input metadata-notes"
                value={document.notes}
                onChange={(event) => setMetadata({ notes: event.currentTarget.value })}
              />
            </label>
          </section>
        </aside>
      </main>

      <section className={`print-workspace ${isReportVisible ? 'has-report' : 'no-report'}`} aria-hidden="true">
        {isReportVisible ? (
          <section className="panel canvas-panel report-panel print-report-panel">
            <div className="panel-title">
              <h2>Report</h2>
              <span>{reportSummary.usedColorCount} colors used</span>
            </div>
            <div className="report-content">
              <dl className="report-info-list">
                {reportSummary.entries.map((entry) => (
                  <div key={`print-${entry.label}`} className="report-info-row">
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
                        <div key={`print-${item.colorIndex}`} className="report-color-row">
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
                        <div key={`print-${item.colorIndex}-${item.count}-${index}`} className="report-bead-row">
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

        {isDraftVisible
          ? printChunks.map((chunk) => {
              const chunkLabel = formatLegacyChunkLabel(height, chunk.start, chunk.end)
              return (
                <section key={`print-draft-${chunk.start}-${chunk.end}`} className="panel canvas-panel draft-panel print-panel">
                  <div className="panel-title">
                    <h2>Draft</h2>
                    <span>Rows {chunkLabel}</span>
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
              const chunkLabel = formatLegacyChunkLabel(height, chunk.start, chunk.end)
              return (
                <section key={`print-corrected-${chunk.start}-${chunk.end}`} className="panel canvas-panel print-panel">
                  <div className="panel-title">
                    <h2>Corrected</h2>
                    <span>Rows {chunkLabel}</span>
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
              const chunkLabel = formatLegacyChunkLabel(height, chunk.start, chunk.end)
              return (
                <section key={`print-simulation-${chunk.start}-${chunk.end}`} className="panel canvas-panel print-panel">
                  <div className="panel-title">
                    <h2>Simulation</h2>
                    <span>Rows {chunkLabel}</span>
                  </div>
                  <div className="canvas-scroll">
                    <BeadPreviewCanvas document={document} variant="simulation" rowStart={chunk.start} rowEndExclusive={chunk.end} />
                  </div>
                </section>
              )
            })
          : null}
      </section>

      {isRecentDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog recent-dialog panel" role="dialog" aria-modal="true" aria-label="Open recent">
            <div className="panel-title">
              <h2>Open Recent</h2>
              <span>{recentFiles.length} files</span>
            </div>
            {recentFiles.length === 0 ? (
              <p className="recent-empty">No recent files yet.</p>
            ) : (
              <div className="recent-list">
                {recentFiles.map((entry) => (
                  <div key={entry.id} className="recent-item">
                    <button className="action recent-open" onClick={() => void onOpenRecentFile(entry)}>
                      <span className="recent-name">{entry.name}</span>
                      <span className="recent-date">{formatRecentTimestamp(entry.updatedAt)}</span>
                    </button>
                    <button className="action recent-remove" onClick={() => void onDeleteRecentEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsRecentDialogOpen(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isPatternWidthDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Pattern width">
            <div className="panel-title">
              <h2>Pattern Width</h2>
            </div>
            <div className="arrange-form">
              <label className="arrange-field">
                Width (beads)
                <input
                  className="arrange-input"
                  type="number"
                  min={MIN_PATTERN_WIDTH}
                  max={MAX_PATTERN_WIDTH}
                  step={1}
                  value={patternWidthInput}
                  onChange={(event) => setPatternWidthInput(event.currentTarget.value)}
                />
              </label>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsPatternWidthDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={onApplyPatternWidth}>
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isPatternHeightDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Pattern height">
            <div className="panel-title">
              <h2>Pattern Height</h2>
            </div>
            <div className="arrange-form">
              <label className="arrange-field">
                Height (rows)
                <input
                  className="arrange-input"
                  type="number"
                  min={MIN_PATTERN_HEIGHT}
                  max={MAX_PATTERN_HEIGHT}
                  step={1}
                  value={patternHeightInput}
                  onChange={(event) => setPatternHeightInput(event.currentTarget.value)}
                />
              </label>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsPatternHeightDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={onApplyPatternHeight}>
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}

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
