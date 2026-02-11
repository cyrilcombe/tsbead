import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  Eraser,
  FilePlus2,
  FolderClock,
  FolderOpen,
  Info,
  Printer,
  LayoutGrid,
  Menu,
  Minus,
  MoveHorizontal,
  MoveVertical,
  PaintBucket,
  Palette,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RotateCw,
  Scan,
  Save,
  SaveAll,
  Settings2,
  Slash,
  SquareDashed,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from './domain/defaults'
import { useEditorStore } from './domain/editorStore'
import { buildReportSummary } from './domain/report'
import { parseJbb, serializeJbb } from './io/jbb/format'
import {
  type AppSettings,
  deleteRecentFile,
  listRecentFiles,
  loadAppSettings,
  loadProject,
  type RecentFileRecord,
  saveAppSettings,
  saveProject,
  saveRecentFile,
} from './storage/db'
import { BeadCanvas } from './ui/canvas/BeadCanvas'
import { BeadPreviewCanvas } from './ui/canvas/BeadPreviewCanvas'
import type { CellPoint, JBeadDocument, SelectionRect, ViewPaneId } from './domain/types'
import tsbeadLogoHorizontal from './assets/tsbead-logo-horizontal.png'
import './index.css'

const LOCAL_PROJECT_ID = 'local-default'
const LOCAL_PROJECT_NAME = 'Local Draft'
const DEFAULT_FILE_NAME = 'design.jbb'
const JBB_FILE_PICKER_ACCEPT = { 'text/plain': ['.jbb'] }
const RECENT_FILES_LIMIT = 8
const PRINT_CHUNK_SIZE_A4_PORTRAIT = 100
const PRINT_CHUNK_SIZE_LETTER_PORTRAIT = 90
const PRINT_CHUNK_SIZE_LANDSCAPE = 60
const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultAuthor: '',
  defaultOrganization: '',
  symbols: DEFAULT_BEAD_SYMBOLS,
  printPageSize: 'a4',
  printOrientation: 'portrait',
}
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

function metadataInlineLabel(author: string, organization: string): string {
  const trimmedAuthor = author.trim()
  const trimmedOrganization = organization.trim()
  if (trimmedAuthor.length > 0 && trimmedOrganization.length > 0) {
    return `${trimmedAuthor} (${trimmedOrganization})`
  }
  if (trimmedAuthor.length > 0) {
    return trimmedAuthor
  }
  if (trimmedOrganization.length > 0) {
    return `(${trimmedOrganization})`
  }
  return 'Metadata...'
}

function App() {
  const document = useEditorStore((state) => state.document)
  const selection = useEditorStore((state) => state.selection)
  const toggleCell = useEditorStore((state) => state.toggleCell)
  const pickColorAt = useEditorStore((state) => state.pickColorAt)
  const drawLine = useEditorStore((state) => state.drawLine)
  const fillLine = useEditorStore((state) => state.fillLine)
  const setMetadata = useEditorStore((state) => state.setMetadata)
  const setSymbols = useEditorStore((state) => state.setSymbols)
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
  const clearSelection = useEditorStore((state) => state.clearSelection)
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
  const viewsMenuRef = useRef<HTMLDivElement | null>(null)
  const colorMenuRef = useRef<HTMLDivElement | null>(null)
  const backgroundMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileActionsMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileColorMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileBackgroundMenuRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<CellPoint | null>(null)
  const isSpaceToolActiveRef = useRef(false)
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
  const [isPatternSizeDialogOpen, setIsPatternSizeDialogOpen] = useState(false)
  const [patternWidthInput, setPatternWidthInput] = useState('15')
  const [patternHeightInput, setPatternHeightInput] = useState('120')
  const [isZoomFitMode, setIsZoomFitMode] = useState(false)
  const [editingPaletteColorIndex, setEditingPaletteColorIndex] = useState<number | null>(null)
  const [openFileName, setOpenFileName] = useState(DEFAULT_FILE_NAME)
  const [openFileHandle, setOpenFileHandle] = useState<FileSystemFileHandleLike | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([])
  const [isRecentDialogOpen, setIsRecentDialogOpen] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false)
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [isViewsMenuOpen, setIsViewsMenuOpen] = useState(false)
  const [isMobileActionsMenuOpen, setIsMobileActionsMenuOpen] = useState(false)
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false)
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false)
  const [preferencesAuthorInput, setPreferencesAuthorInput] = useState('')
  const [preferencesOrganizationInput, setPreferencesOrganizationInput] = useState('')
  const [preferencesSymbolsInput, setPreferencesSymbolsInput] = useState(DEFAULT_BEAD_SYMBOLS)
  const [metadataAuthorInput, setMetadataAuthorInput] = useState('')
  const [metadataOrganizationInput, setMetadataOrganizationInput] = useState('')
  const [metadataNotesInput, setMetadataNotesInput] = useState('')
  const [pageSetupSizeInput, setPageSetupSizeInput] = useState<AppSettings['printPageSize']>('a4')
  const [pageSetupOrientationInput, setPageSetupOrientationInput] = useState<AppSettings['printOrientation']>('portrait')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loadedSettings = await loadAppSettings()
        if (cancelled) {
          return
        }
        setAppSettings(loadedSettings)

        const project = await loadProject(LOCAL_PROJECT_ID)
        if (cancelled) {
          return
        }
        if (project) {
          setDocument(project.document)
        } else {
          setDocument(
            createEmptyDocument(15, 120, {
              author: loadedSettings.defaultAuthor,
              organization: loadedSettings.defaultOrganization,
              symbols: loadedSettings.symbols,
            }),
          )
        }
      } catch {
        if (cancelled) {
          return
        }
        setAppSettings(DEFAULT_APP_SETTINGS)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setDocument])

  useEffect(() => {
    const bodyClassList = window.document.body.classList
    bodyClassList.remove('print-page-a4', 'print-page-letter', 'print-orientation-portrait', 'print-orientation-landscape')
    bodyClassList.add(`print-page-${appSettings.printPageSize}`, `print-orientation-${appSettings.printOrientation}`)
    return () => {
      bodyClassList.remove(`print-page-${appSettings.printPageSize}`, `print-orientation-${appSettings.printOrientation}`)
    }
  }, [appSettings.printOrientation, appSettings.printPageSize])

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

  useEffect(() => {
    if (!isViewsMenuOpen && !isColorMenuOpen && !isBackgroundMenuOpen && !isMobileActionsMenuOpen) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (
        viewsMenuRef.current?.contains(target) ||
        colorMenuRef.current?.contains(target) ||
        backgroundMenuRef.current?.contains(target) ||
        mobileActionsMenuRef.current?.contains(target) ||
        mobileColorMenuRef.current?.contains(target) ||
        mobileBackgroundMenuRef.current?.contains(target)
      ) {
        return
      }
      setIsViewsMenuOpen(false)
      setIsColorMenuOpen(false)
      setIsBackgroundMenuOpen(false)
      setIsMobileActionsMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isBackgroundMenuOpen, isColorMenuOpen, isMobileActionsMenuOpen, isViewsMenuOpen])

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
  const selectedColorValue = document.colors[selectedColor] ?? document.colors[0] ?? [0, 0, 0, 255]
  const backgroundColorValue = document.colors[0] ?? [0, 0, 0, 255]
  const metadataLabel = useMemo(
    () => metadataInlineLabel(document.author, document.organization),
    [document.author, document.organization],
  )
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
    if (selectedTool === 'line' || selectedTool === 'pencil') {
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
    const printChunkSize =
      appSettings.printOrientation === 'landscape'
        ? PRINT_CHUNK_SIZE_LANDSCAPE
        : appSettings.printPageSize === 'letter'
          ? PRINT_CHUNK_SIZE_LETTER_PORTRAIT
          : PRINT_CHUNK_SIZE_A4_PORTRAIT
    const chunks: Array<{ start: number; end: number }> = []
    for (let start = 0; start < height; start += printChunkSize) {
      chunks.push({ start, end: Math.min(height, start + printChunkSize) })
    }
    return chunks
  }, [appSettings.printOrientation, appSettings.printPageSize, height])

  const onPointerDown = (point: CellPoint, allowShapeTools: boolean) => {
    if ((selectedTool === 'line' || selectedTool === 'select') && !allowShapeTools) {
      dragStartRef.current = null
      setDragPreview(null)
      return
    }

    dragStartRef.current = point
    if (selectedTool === 'line' || selectedTool === 'select' || selectedTool === 'pencil') {
      setDragPreview({ start: point, end: point })
    } else {
      setDragPreview(null)
    }

    if (selectedTool === 'fill') {
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

    if (selectedTool === 'line' || selectedTool === 'select' || selectedTool === 'pencil') {
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
    } else if (selectedTool === 'pencil') {
      if (start.x === point.x && start.y === point.y) {
        toggleCell(start.x, start.y, selectedColor)
      } else {
        drawLine(start, point, selectedColor)
      }
    } else if (selectedTool === 'select') {
      if (start.x === point.x && start.y === point.y) {
        clearSelection()
        toggleCell(start.x, start.y, selectedColor)
      } else {
        setSelection({ start, end: point })
      }
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

  const onOpenArrangeDialog = useCallback(() => {
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
  }, [selection, width])

  const onApplyArrange = () => {
    const copies = parseArrangeValue(arrangeCopies, 1)
    const horizontalOffset = parseArrangeValue(arrangeHorizontalOffset, 0)
    const verticalOffset = parseArrangeValue(arrangeVerticalOffset, 0)
    arrangeSelection(copies, horizontalOffset, verticalOffset)
    setIsArrangeDialogOpen(false)
  }

  const onOpenPatternSizeDialog = () => {
    setPatternWidthInput(String(width))
    setPatternHeightInput(String(height))
    setIsPatternSizeDialogOpen(true)
  }

  const onApplyPatternSize = () => {
    const nextWidth = parsePatternDimensionValue(
      patternWidthInput,
      width,
      MIN_PATTERN_WIDTH,
      MAX_PATTERN_WIDTH,
    )
    const nextHeight = parsePatternDimensionValue(
      patternHeightInput,
      height,
      MIN_PATTERN_HEIGHT,
      MAX_PATTERN_HEIGHT,
    )
    if (nextWidth !== width) {
      setPatternWidth(nextWidth)
    }
    if (nextHeight !== height) {
      setPatternHeight(nextHeight)
    }
    setIsPatternSizeDialogOpen(false)
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

  const createDocumentFromPreferences = useCallback(
    (settings: AppSettings): JBeadDocument =>
      createEmptyDocument(15, 120, {
        author: settings.defaultAuthor,
        organization: settings.defaultOrganization,
        symbols: settings.symbols,
      }),
    [],
  )

  const onNewDocument = useCallback((): boolean => {
    if (!onDiscardUnsavedChanges()) {
      return false
    }
    setDocument(createDocumentFromPreferences(appSettings))
    setOpenFileHandle(null)
    setOpenFileName(DEFAULT_FILE_NAME)
    return true
  }, [appSettings, createDocumentFromPreferences, onDiscardUnsavedChanges, setDocument])

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

  const onOpenPreferencesDialog = useCallback(() => {
    setPreferencesAuthorInput(appSettings.defaultAuthor)
    setPreferencesOrganizationInput(appSettings.defaultOrganization)
    setPreferencesSymbolsInput(appSettings.symbols)
    setPageSetupSizeInput(appSettings.printPageSize)
    setPageSetupOrientationInput(appSettings.printOrientation)
    setIsPreferencesDialogOpen(true)
  }, [appSettings])

  const onOpenCreditsDialog = useCallback(() => {
    setIsCreditsDialogOpen(true)
  }, [])

  const onOpenMetadataDialog = useCallback(() => {
    setMetadataAuthorInput(document.author)
    setMetadataOrganizationInput(document.organization)
    setMetadataNotesInput(document.notes)
    setIsMetadataDialogOpen(true)
  }, [document.author, document.notes, document.organization])

  const onSelectMobileView = useCallback(
    (pane: ViewPaneId) => {
      setViewVisibility('draft', pane === 'draft')
      setViewVisibility('corrected', pane === 'corrected')
      setViewVisibility('simulation', pane === 'simulation')
      setViewVisibility('report', pane === 'report')
    },
    [setViewVisibility],
  )

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

  const onApplyPreferences = useCallback(async () => {
    const nextSettings: AppSettings = {
      ...appSettings,
      defaultAuthor: preferencesAuthorInput.trim(),
      defaultOrganization: preferencesOrganizationInput.trim(),
      symbols: preferencesSymbolsInput.length > 0 ? preferencesSymbolsInput : DEFAULT_BEAD_SYMBOLS,
      printPageSize: pageSetupSizeInput,
      printOrientation: pageSetupOrientationInput,
    }

    try {
      await saveAppSettings(nextSettings)
      setAppSettings(nextSettings)

      if (document.author !== nextSettings.defaultAuthor || document.organization !== nextSettings.defaultOrganization) {
        setMetadata({
          author: nextSettings.defaultAuthor,
          organization: nextSettings.defaultOrganization,
        })
      }
      if (document.view.symbols !== nextSettings.symbols) {
        setSymbols(nextSettings.symbols)
      }

      setIsPreferencesDialogOpen(false)
    } catch (error) {
      window.alert(`Could not save preferences: ${getErrorMessage(error)}`)
    }
  }, [
    appSettings,
    document.author,
    document.organization,
    document.view.symbols,
    preferencesAuthorInput,
    preferencesOrganizationInput,
    preferencesSymbolsInput,
    pageSetupOrientationInput,
    pageSetupSizeInput,
    setMetadata,
    setSymbols,
  ])

  const onApplyMetadata = useCallback(() => {
    setMetadata({
      author: metadataAuthorInput,
      organization: metadataOrganizationInput,
      notes: metadataNotesInput,
    })
    setIsMetadataDialogOpen(false)
  }, [metadataAuthorInput, metadataNotesInput, metadataOrganizationInput, setMetadata])

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
  const mobileActivePane: ViewPaneId = isDraftVisible
    ? 'draft'
    : isCorrectedVisible
      ? 'corrected'
      : isSimulationVisible
        ? 'simulation'
        : 'report'

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
      if ((isViewsMenuOpen || isColorMenuOpen || isBackgroundMenuOpen || isMobileActionsMenuOpen) && event.key === 'Escape') {
        setIsViewsMenuOpen(false)
        setIsColorMenuOpen(false)
        setIsBackgroundMenuOpen(false)
        setIsMobileActionsMenuOpen(false)
        event.preventDefault()
        return
      }

      if (
        isPreferencesDialogOpen ||
        isCreditsDialogOpen ||
        isMobileActionsMenuOpen ||
        isMetadataDialogOpen ||
        isRecentDialogOpen ||
        isArrangeDialogOpen ||
        isPatternSizeDialogOpen
      ) {
        if (event.key === 'Escape') {
          setIsPreferencesDialogOpen(false)
          setIsCreditsDialogOpen(false)
          setIsMobileActionsMenuOpen(false)
          setIsMetadataDialogOpen(false)
          setIsRecentDialogOpen(false)
          setIsArrangeDialogOpen(false)
          setIsPatternSizeDialogOpen(false)
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
        } else if (lowerKey === 'p' && event.shiftKey) {
          onOpenPreferencesDialog()
          handled = true
        } else if (lowerKey === 'p' && !event.shiftKey) {
          onPrintDocument()
          handled = true
        } else if (event.code === 'Comma' && !event.shiftKey) {
          onOpenPreferencesDialog()
          handled = true
        } else if (lowerKey === 'i' && !event.shiftKey) {
          setIsZoomFitMode(false)
          zoomIn()
          handled = true
        } else if (lowerKey === 'u' && !event.shiftKey) {
          setIsZoomFitMode(false)
          zoomOut()
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
        } else if (event.key === 'Escape') {
          clearSelection()
          handled = true
        } else if (event.code === 'Space') {
          if (!event.repeat) {
            isSpaceToolActiveRef.current = true
            setSelectedTool('pipette')
          }
          handled = true
        } else if (event.key === 'F8') {
          onOpenArrangeDialog()
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

    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }
      if (event.code === 'Space' && isSpaceToolActiveRef.current) {
        isSpaceToolActiveRef.current = false
        setSelectedTool('pencil')
        event.preventDefault()
      }
    }

    const onBlur = () => {
      if (!isSpaceToolActiveRef.current) {
        return
      }
      isSpaceToolActiveRef.current = false
      setSelectedTool('pencil')
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [
    clearSelection,
    isArrangeDialogOpen,
    isBackgroundMenuOpen,
    isCreditsDialogOpen,
    isMobileActionsMenuOpen,
    isColorMenuOpen,
    isMetadataDialogOpen,
    isPreferencesDialogOpen,
    isRecentDialogOpen,
    isViewsMenuOpen,
    isPatternSizeDialogOpen,
    onDeleteSelection,
    onNewDocument,
    onOpenDocument,
    onOpenPreferencesDialog,
    onOpenRecentDialog,
    onOpenArrangeDialog,
    onPrintDocument,
    onSaveAsDocument,
    onSaveDocument,
    redo,
    setSelectedColor,
    setSelectedTool,
    zoomIn,
    zoomOut,
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
        <div className="mobile-header-left" ref={mobileActionsMenuRef}>
          <button
            className="action icon-action mobile-menu-toggle"
            aria-label="Open actions menu"
            aria-expanded={isMobileActionsMenuOpen}
            onClick={() => setIsMobileActionsMenuOpen((value) => !value)}
          >
            <Menu className="tool-icon" aria-hidden="true" />
          </button>
          {isMobileActionsMenuOpen ? (
            <div className="mobile-actions-menu">
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onNewDocument()
                }}
              >
                <FilePlus2 className="header-action-icon" aria-hidden="true" />
                <span>New</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  void onOpenDocument()
                }}
              >
                <FolderOpen className="header-action-icon" aria-hidden="true" />
                <span>Open...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onOpenRecentDialog()
                }}
                disabled={recentFiles.length === 0}
              >
                <FolderClock className="header-action-icon" aria-hidden="true" />
                <span>Open recent...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  void onSaveDocument()
                }}
              >
                <Save className="header-action-icon" aria-hidden="true" />
                <span>Save</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  void onSaveAsDocument()
                }}
              >
                <SaveAll className="header-action-icon" aria-hidden="true" />
                <span>Save As...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onDownloadFile(openFileName)
                }}
              >
                <Download className="header-action-icon" aria-hidden="true" />
                <span>Export .jbb</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onPrintDocument()
                }}
                disabled={!hasAnyPaneVisible}
              >
                <Printer className="header-action-icon" aria-hidden="true" />
                <span>Print...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onOpenPreferencesDialog()
                }}
              >
                <Settings2 className="header-action-icon" aria-hidden="true" />
                <span>Preferences...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  setIsMobileActionsMenuOpen(false)
                  onOpenCreditsDialog()
                }}
              >
                <Info className="header-action-icon" aria-hidden="true" />
                <span>Credits...</span>
              </button>
              <div className="mobile-actions-file">
                <strong>{openFileName}</strong>
                {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
                <button
                  className="metadata-inline-action"
                  onClick={() => {
                    setIsMobileActionsMenuOpen(false)
                    onOpenMetadataDialog()
                  }}
                  title="Edit metadata"
                >
                  {metadataLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="header-main">
          <img className="app-logo" src={tsbeadLogoHorizontal} alt="TsBead" />
        </div>
        <p className="mobile-file-status">
          <strong>{openFileName}</strong>
          {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
        </p>
        <div className="header-controls">
          <div className="header-actions">
            <button className="action header-action" onClick={onNewDocument}>
              <FilePlus2 className="header-action-icon" aria-hidden="true" />
              <span>New</span>
            </button>
            <button className="action header-action" onClick={() => void onOpenDocument()}>
              <FolderOpen className="header-action-icon" aria-hidden="true" />
              <span>Open...</span>
            </button>
            <button className="action header-action" onClick={onOpenRecentDialog} disabled={recentFiles.length === 0}>
              <FolderClock className="header-action-icon" aria-hidden="true" />
              <span>Open recent...</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveDocument()}>
              <Save className="header-action-icon" aria-hidden="true" />
              <span>Save</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveAsDocument()}>
              <SaveAll className="header-action-icon" aria-hidden="true" />
              <span>Save As...</span>
            </button>
            <button
              className="action header-action"
              onClick={() => {
                onDownloadFile(openFileName)
              }}
            >
              <Download className="header-action-icon" aria-hidden="true" />
              <span>Export .jbb</span>
            </button>
            <button className="action header-action" onClick={onPrintDocument} disabled={!hasAnyPaneVisible}>
              <Printer className="header-action-icon" aria-hidden="true" />
              <span>Print...</span>
            </button>
            <button className="action header-action" onClick={onOpenPreferencesDialog}>
              <Settings2 className="header-action-icon" aria-hidden="true" />
              <span>Preferences...</span>
            </button>
            <button className="action header-action" onClick={onOpenCreditsDialog}>
              <Info className="header-action-icon" aria-hidden="true" />
              <span>Credits...</span>
            </button>
          </div>
          <p className="file-status">
            <strong>{openFileName}</strong>
            {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
            <button className="metadata-inline-action" onClick={onOpenMetadataDialog} title="Edit metadata">
              {metadataLabel}
            </button>
          </p>
        </div>
        <input ref={openFileInputRef} className="hidden-file-input" type="file" accept=".jbb,text/plain" onChange={onFileInputChange} />
      </header>

      <section className="mobile-view-tabs" aria-label="View tabs">
        {VIEW_PANES.map((pane) => (
          <button
            key={`mobile-tab-${pane.id}`}
            className={`action mobile-view-tab ${mobileActivePane === pane.id ? 'active' : ''}`}
            onClick={() => onSelectMobileView(pane.id)}
          >
            {pane.label}
          </button>
        ))}
      </section>

      <section className="panel tools-panel">
        <div className="toolbar-layout">
          <div className="toolbar-side toolbar-edit">
            <div className="button-strip toolbar-group">
              <button
                className={`action icon-action tool-action ${selectedTool === 'pencil' ? 'active' : ''}`}
                onClick={() => setSelectedTool('pencil')}
                title="Pencil (Ctrl/Cmd+1)"
                aria-label="Pencil"
              >
                <Pencil className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action tool-action ${selectedTool === 'line' ? 'active' : ''}`}
                onClick={() => setSelectedTool('line')}
                title="Line (Ctrl/Cmd+2)"
                aria-label="Line"
              >
                <Slash className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action tool-action ${selectedTool === 'fill' ? 'active' : ''}`}
                onClick={() => setSelectedTool('fill')}
                title="Fill (Ctrl/Cmd+3)"
                aria-label="Fill"
              >
                <PaintBucket className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action tool-action ${selectedTool === 'pipette' ? 'active' : ''}`}
                onClick={() => setSelectedTool('pipette')}
                title="Pipette (Ctrl/Cmd+6)"
                aria-label="Pipette"
              >
                <Pipette className="tool-icon" aria-hidden="true" />
              </button>
            </div>

            <span className="toolbar-separator" aria-hidden="true" />

            <div className="button-strip toolbar-group">
              <div className="palette-menu-wrap" ref={backgroundMenuRef}>
                <button
                  className={`action color-toggle ${isBackgroundMenuOpen ? 'view-toggle active' : ''}`}
                  onClick={() => {
                    setIsBackgroundMenuOpen((value) => !value)
                    setIsColorMenuOpen(false)
                    setIsViewsMenuOpen(false)
                  }}
                  title="Background color"
                  aria-label="Background color"
                >
                  <span className="color-toggle-label">BG</span>
                  <span className="color-toggle-chip" style={{ backgroundColor: colorToCss(backgroundColorValue) }} />
                </button>
                {isBackgroundMenuOpen ? (
                  <div className="palette-menu">
                    <div className="palette-menu-grid">
                      {document.colors.map((color, index) => (
                        <button
                          key={`background-color-${color.join('-')}-${index}`}
                          className={`swatch palette-menu-swatch ${index === 0 ? 'selected' : ''}`}
                          style={{ backgroundColor: colorToCss(color) }}
                          onClick={() => {
                            setColorAsBackground(index)
                          }}
                          onDoubleClick={() => onEditPaletteColor(index)}
                          title={`Set background to color ${index}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="palette-menu-wrap" ref={colorMenuRef}>
                <button
                  className={`action color-toggle ${isColorMenuOpen ? 'view-toggle active' : ''}`}
                  onClick={() => {
                    setIsColorMenuOpen((value) => !value)
                    setIsBackgroundMenuOpen(false)
                    setIsViewsMenuOpen(false)
                  }}
                  title="Drawing color"
                  aria-label="Drawing color"
                >
                  <span className="color-toggle-label">Color</span>
                  <span className="color-toggle-chip" style={{ backgroundColor: colorToCss(selectedColorValue) }} />
                </button>
                {isColorMenuOpen ? (
                  <div className="palette-menu">
                    <div className="palette-menu-grid">
                      {document.colors.map((color, index) => (
                        <button
                          key={`selected-color-${color.join('-')}-${index}`}
                          className={`swatch palette-menu-swatch ${selectedColor === index ? 'selected' : ''}`}
                          style={{ backgroundColor: colorToCss(color) }}
                          onClick={() => {
                            setSelectedColor(index)
                          }}
                          onDoubleClick={() => onEditPaletteColor(index)}
                          title={`Color ${index}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <span className="toolbar-separator" aria-hidden="true" />

            <div className="button-strip toolbar-group">
              <button
                className={`action icon-action tool-action ${selectedTool === 'select' ? 'active' : ''}`}
                onClick={() => setSelectedTool('select')}
                title="Select (Ctrl/Cmd+4)"
                aria-label="Select"
              >
                <SquareDashed className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className="action icon-action"
                onClick={onDeleteSelection}
                disabled={selection === null}
                title="Delete selection (Ctrl/Cmd+5)"
                aria-label="Delete selection"
              >
                <Eraser className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={onOpenArrangeDialog} disabled={selection === null} title="Arrange... (F8)" aria-label="Arrange">
                <Copy className="tool-icon" aria-hidden="true" />
              </button>
            </div>

            <span className="toolbar-separator" aria-hidden="true" />

            <div className="button-strip toolbar-group">
              <button className="action icon-action" onClick={() => insertRow()} title="Insert row" aria-label="Insert row">
                <Plus className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => deleteRow()} title="Delete row" aria-label="Delete row">
                <Minus className="tool-icon" aria-hidden="true" />
              </button>
            </div>

            <span className="toolbar-separator" aria-hidden="true" />

            <div className="button-strip toolbar-group">
              <button className="action icon-action" onClick={() => mirrorHorizontal()} title="Mirror horizontal" aria-label="Mirror horizontal">
                <MoveHorizontal className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => mirrorVertical()} title="Mirror vertical" aria-label="Mirror vertical">
                <MoveVertical className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => rotateClockwise()} disabled={!canRotate} title="Rotate 90" aria-label="Rotate 90">
                <RotateCw className="tool-icon" aria-hidden="true" />
              </button>
            </div>

            <span className="toolbar-separator" aria-hidden="true" />

            <div className="button-strip toolbar-group">
              <button className="action icon-action" onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
                <Undo2 className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl/Cmd+Y)" aria-label="Redo">
                <Redo2 className="tool-icon" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="toolbar-side toolbar-view">
            <div className="button-strip toolbar-group">
              <div className="views-menu-wrap" ref={viewsMenuRef}>
                <button
                  className={`action ${isViewsMenuOpen ? 'view-toggle active' : ''}`}
                  aria-expanded={isViewsMenuOpen}
                  onClick={() => {
                    setIsViewsMenuOpen((value) => !value)
                    setIsColorMenuOpen(false)
                    setIsBackgroundMenuOpen(false)
                  }}
                >
                  Views
                </button>
                {isViewsMenuOpen ? (
                  <div className="views-menu">
                    {VIEW_PANES.map((pane) => {
                      const visible = paneVisibilityById[pane.id]
                      return (
                        <label key={pane.id} className="views-menu-item">
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={() => setViewVisibility(pane.id, !visible)}
                          />
                          <span>{pane.label}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : null}
              </div>
              <button className="action icon-action" onClick={onOpenPatternSizeDialog} title="Pattern size..." aria-label="Pattern size">
                <LayoutGrid className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className="action icon-action"
                onClick={() => {
                  setIsZoomFitMode(false)
                  zoomOut()
                }}
                disabled={!canZoomOut}
                title="Zoom out (Ctrl/Cmd+U)"
                aria-label="Zoom out"
              >
                <ZoomOut className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action ${isZoomFitMode ? 'view-toggle active' : ''}`}
                onClick={() => {
                  setIsZoomFitMode(true)
                  applyZoomFit()
                }}
                disabled={!hasCanvasPaneVisible}
                title="Zoom 100%"
                aria-label="Zoom 100%"
              >
                <Scan className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className="action icon-action"
                onClick={() => {
                  setIsZoomFitMode(false)
                  zoomIn()
                }}
                disabled={!canZoomIn}
                title="Zoom in (Ctrl/Cmd+I)"
                aria-label="Zoom in"
              >
                <ZoomIn className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => shiftLeft()} title="Shift left (ArrowLeft)" aria-label="Shift left">
                <ArrowLeft className="tool-icon" aria-hidden="true" />
              </button>
              <button className="action icon-action" onClick={() => shiftRight()} title="Shift right (ArrowRight)" aria-label="Shift right">
                <ArrowRight className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action view-toggle ${drawColors ? 'active' : ''}`}
                aria-pressed={drawColors}
                onClick={() => setDrawColors(!drawColors)}
                title="Draw colors"
                aria-label="Draw colors"
              >
                <Palette className="tool-icon" aria-hidden="true" />
              </button>
              <button
                className={`action icon-action view-toggle ${drawSymbols ? 'active' : ''}`}
                aria-pressed={drawSymbols}
                onClick={() => setDrawSymbols(!drawSymbols)}
                title="Draw symbols"
                aria-label="Draw symbols"
              >
                <Type className="tool-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="workspace">
        <aside className="panel mobile-edit-rail" aria-label="Editing tools">
          <div className="mobile-edit-group">
            <button
              className={`action icon-action tool-action ${selectedTool === 'pencil' ? 'active' : ''}`}
              onClick={() => setSelectedTool('pencil')}
              title="Pencil (Ctrl/Cmd+1)"
              aria-label="Pencil"
            >
              <Pencil className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'line' ? 'active' : ''}`}
              onClick={() => setSelectedTool('line')}
              title="Line (Ctrl/Cmd+2)"
              aria-label="Line"
            >
              <Slash className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'fill' ? 'active' : ''}`}
              onClick={() => setSelectedTool('fill')}
              title="Fill (Ctrl/Cmd+3)"
              aria-label="Fill"
            >
              <PaintBucket className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'pipette' ? 'active' : ''}`}
              onClick={() => setSelectedTool('pipette')}
              title="Pipette (Ctrl/Cmd+6)"
              aria-label="Pipette"
            >
              <Pipette className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'select' ? 'active' : ''}`}
              onClick={() => setSelectedTool('select')}
              title="Select (Ctrl/Cmd+4)"
              aria-label="Select"
            >
              <SquareDashed className="tool-icon" aria-hidden="true" />
            </button>
          </div>

          <span className="mobile-edit-separator" aria-hidden="true" />

          <div className="mobile-edit-group">
            <div className="palette-menu-wrap compact-color-wrap" ref={mobileBackgroundMenuRef}>
              <button
                className={`action icon-action compact-color-toggle ${isBackgroundMenuOpen ? 'view-toggle active' : ''}`}
                onClick={() => {
                  setIsBackgroundMenuOpen((value) => !value)
                  setIsColorMenuOpen(false)
                  setIsViewsMenuOpen(false)
                }}
                title="Background color"
                aria-label="Background color"
              >
                <span className="compact-color-label">BG</span>
                <span className="compact-color-chip" style={{ backgroundColor: colorToCss(backgroundColorValue) }} />
              </button>
              {isBackgroundMenuOpen ? (
                <div className="palette-menu compact-palette-menu">
                  <div className="palette-menu-grid">
                    {document.colors.map((color, index) => (
                      <button
                        key={`mobile-background-color-${color.join('-')}-${index}`}
                        className={`swatch palette-menu-swatch ${index === 0 ? 'selected' : ''}`}
                        style={{ backgroundColor: colorToCss(color) }}
                        onClick={() => {
                          setColorAsBackground(index)
                        }}
                        onDoubleClick={() => onEditPaletteColor(index)}
                        title={`Set background to color ${index}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="palette-menu-wrap compact-color-wrap" ref={mobileColorMenuRef}>
              <button
                className={`action icon-action compact-color-toggle ${isColorMenuOpen ? 'view-toggle active' : ''}`}
                onClick={() => {
                  setIsColorMenuOpen((value) => !value)
                  setIsBackgroundMenuOpen(false)
                  setIsViewsMenuOpen(false)
                }}
                title="Drawing color"
                aria-label="Drawing color"
              >
                <span className="compact-color-label">C</span>
                <span className="compact-color-chip" style={{ backgroundColor: colorToCss(selectedColorValue) }} />
              </button>
              {isColorMenuOpen ? (
                <div className="palette-menu compact-palette-menu">
                  <div className="palette-menu-grid">
                    {document.colors.map((color, index) => (
                      <button
                        key={`mobile-selected-color-${color.join('-')}-${index}`}
                        className={`swatch palette-menu-swatch ${selectedColor === index ? 'selected' : ''}`}
                        style={{ backgroundColor: colorToCss(color) }}
                        onClick={() => {
                          setSelectedColor(index)
                        }}
                        onDoubleClick={() => onEditPaletteColor(index)}
                        title={`Color ${index}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <span className="mobile-edit-separator" aria-hidden="true" />

          <div className="mobile-edit-group">
            <button className="action icon-action" onClick={onDeleteSelection} disabled={selection === null} title="Delete selection (Ctrl/Cmd+5)" aria-label="Delete selection">
              <Eraser className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onOpenArrangeDialog} disabled={selection === null} title="Arrange... (F8)" aria-label="Arrange">
              <Copy className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => insertRow()} title="Insert row" aria-label="Insert row">
              <Plus className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => deleteRow()} title="Delete row" aria-label="Delete row">
              <Minus className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => mirrorHorizontal()} title="Mirror horizontal" aria-label="Mirror horizontal">
              <MoveHorizontal className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => mirrorVertical()} title="Mirror vertical" aria-label="Mirror vertical">
              <MoveVertical className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => rotateClockwise()} disabled={!canRotate} title="Rotate 90" aria-label="Rotate 90">
              <RotateCw className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
              <Undo2 className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl/Cmd+Y)" aria-label="Redo">
              <Redo2 className="tool-icon" aria-hidden="true" />
            </button>
          </div>
        </aside>

        <section
          className={`preview-with-scrollbar ${hasCanvasPaneVisible ? 'has-canvas' : 'no-canvas'} ${isReportVisible ? 'has-report' : 'no-report'}`}
        >
          {hasCanvasPaneVisible || !isReportVisible ? (
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

              {!hasAnyPaneVisible ? (
                <section className="panel empty-pane">
                  <p>Select at least one view to display a pane.</p>
                </section>
              ) : null}
            </section>
          ) : null}

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

          {isReportVisible ? (
            <section className="panel canvas-panel report-panel report-split-panel">
              <div className="panel-title">
                <h2>Report</h2>
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
        </section>
      </main>

      <input
        ref={paletteColorPickerRef}
        className="palette-color-picker"
        type="color"
        value={colorToHex(document.colors[editingPaletteColorIndex ?? selectedColor] ?? document.colors[0] ?? [0, 0, 0, 255])}
        onChange={(event) => onPaletteColorPicked(event.currentTarget.value)}
        onBlur={() => setEditingPaletteColorIndex(null)}
      />

      <section className={`print-workspace ${isReportVisible ? 'has-report' : 'no-report'}`} aria-hidden="true">
        {isReportVisible ? (
          <section className="panel canvas-panel report-panel print-report-panel">
            <div className="panel-title">
              <h2>Report</h2>
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

      {isMetadataDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Metadata">
            <div className="panel-title">
              <h2>Metadata</h2>
            </div>
            <div className="arrange-form">
              <label className="arrange-field">
                Author
                <input
                  className="arrange-input"
                  type="text"
                  value={metadataAuthorInput}
                  onChange={(event) => setMetadataAuthorInput(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Organization
                <input
                  className="arrange-input"
                  type="text"
                  value={metadataOrganizationInput}
                  onChange={(event) => setMetadataOrganizationInput(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Notes
                <textarea
                  className="arrange-input metadata-notes-input"
                  value={metadataNotesInput}
                  onChange={(event) => setMetadataNotesInput(event.currentTarget.value)}
                />
              </label>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsMetadataDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={onApplyMetadata}>
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isPreferencesDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Preferences">
            <div className="panel-title">
              <h2>Preferences</h2>
            </div>
            <div className="arrange-form">
              <label className="arrange-field">
                Default author
                <input
                  className="arrange-input"
                  type="text"
                  value={preferencesAuthorInput}
                  onChange={(event) => setPreferencesAuthorInput(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Default organization
                <input
                  className="arrange-input"
                  type="text"
                  value={preferencesOrganizationInput}
                  onChange={(event) => setPreferencesOrganizationInput(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Symbols
                <input
                  className="arrange-input"
                  type="text"
                  value={preferencesSymbolsInput}
                  onChange={(event) => setPreferencesSymbolsInput(event.currentTarget.value)}
                />
              </label>
              <label className="arrange-field">
                Paper
                <select
                  className="arrange-input"
                  value={pageSetupSizeInput}
                  onChange={(event) => setPageSetupSizeInput(event.currentTarget.value as AppSettings['printPageSize'])}
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                </select>
              </label>
              <label className="arrange-field">
                Orientation
                <select
                  className="arrange-input"
                  value={pageSetupOrientationInput}
                  onChange={(event) => setPageSetupOrientationInput(event.currentTarget.value as AppSettings['printOrientation'])}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsPreferencesDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={() => void onApplyPreferences()}>
                Apply
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isCreditsDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog credits-dialog panel" role="dialog" aria-modal="true" aria-label="Credits">
            <div className="panel-title">
              <h2>Credits</h2>
            </div>
            <div className="credits-content">
              <p>
                TsBead is a TypeScript port of the excellent original work done by Damian Brunold on JBead.
              </p>
              <ul>
                <li>
                  Original author: Damian Brunold
                </li>
                <li>
                  Website:{' '}
                  <a href="https://www.jbead.ch/" target="_blank" rel="noreferrer">
                    https://www.jbead.ch/
                  </a>
                </li>
                <li>
                  GitHub:{' '}
                  <a href="https://github.com/damianbrunold/jbead" target="_blank" rel="noreferrer">
                    https://github.com/damianbrunold/jbead
                  </a>
                </li>
              </ul>
              <p>
                File format support in TsBead: <strong>.jbb only</strong>. The legacy <strong>.dbb</strong> format is not supported.
              </p>
            </div>
            <div className="arrange-actions">
              <button className="action" onClick={() => setIsCreditsDialogOpen(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

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

      {isPatternSizeDialogOpen ? (
        <div className="dialog-backdrop">
          <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Pattern size">
            <div className="panel-title">
              <h2>Pattern Size</h2>
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
              <button className="action" onClick={() => setIsPatternSizeDialogOpen(false)}>
                Cancel
              </button>
              <button className="action tool-action active" onClick={onApplyPatternSize}>
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
