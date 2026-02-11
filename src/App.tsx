import { useCallback, useMemo, useRef, useState } from 'react'
import { DEFAULT_BEAD_SYMBOLS } from './domain/defaults'
import { useEditorStore } from './domain/editorStore'
import { buildReportSummary } from './domain/report'
import {
  type AppSettings,
  type RecentFileRecord,
  saveAppSettings,
} from './storage/db'
import { AppHeader } from './ui/components/AppHeader'
import { DesktopToolbar } from './ui/components/DesktopToolbar'
import { MobileEditRail } from './ui/components/MobileEditRail'
import { PrintWorkspace } from './ui/components/PrintWorkspace'
import { WorkspacePanels } from './ui/components/WorkspacePanels'
import { ArrangeDialog } from './ui/components/dialogs/ArrangeDialog'
import { HelpDialog } from './ui/components/dialogs/HelpDialog'
import { MetadataDialog } from './ui/components/dialogs/MetadataDialog'
import { PatternSizeDialog } from './ui/components/dialogs/PatternSizeDialog'
import { PreferencesDialog } from './ui/components/dialogs/PreferencesDialog'
import { RecentFilesDialog } from './ui/components/dialogs/RecentFilesDialog'
import { useBeforeUnloadGuard } from './ui/hooks/useBeforeUnloadGuard'
import { useDocumentFileActions } from './ui/hooks/useDocumentFileActions'
import { useEditorShortcuts } from './ui/hooks/useEditorShortcuts'
import { useMobilePortraitSinglePane } from './ui/hooks/useMobilePortraitSinglePane'
import { usePaneSync } from './ui/hooks/usePaneSync'
import { usePointerEditing } from './ui/hooks/usePointerEditing'
import { usePointerDismiss } from './ui/hooks/usePointerDismiss'
import { useProjectBootstrap } from './ui/hooks/useProjectBootstrap'
import type { ViewPaneId } from './domain/types'
import tsbeadLogoHorizontal from './assets/tsbead-logo-horizontal.png'
import './index.css'

const PRINT_CHUNK_SIZE_A4_PORTRAIT = 100
const PRINT_CHUNK_SIZE_LETTER_PORTRAIT = 90
const PRINT_CHUNK_SIZE_LANDSCAPE = 60
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
  const viewsMenuRef = useRef<HTMLDivElement | null>(null)
  const colorMenuRef = useRef<HTMLDivElement | null>(null)
  const backgroundMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileActionsMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileColorMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileBackgroundMenuRef = useRef<HTMLDivElement | null>(null)
  const dismissibleMenuRefs = useMemo(
    () => [
      viewsMenuRef,
      colorMenuRef,
      backgroundMenuRef,
      mobileActionsMenuRef,
      mobileColorMenuRef,
      mobileBackgroundMenuRef,
    ],
    [],
  )
  const [isArrangeDialogOpen, setIsArrangeDialogOpen] = useState(false)
  const [arrangeCopies, setArrangeCopies] = useState('1')
  const [arrangeHorizontalOffset, setArrangeHorizontalOffset] = useState('0')
  const [arrangeVerticalOffset, setArrangeVerticalOffset] = useState('0')
  const [isPatternSizeDialogOpen, setIsPatternSizeDialogOpen] = useState(false)
  const [patternWidthInput, setPatternWidthInput] = useState('15')
  const [patternHeightInput, setPatternHeightInput] = useState('120')
  const [isZoomFitMode, setIsZoomFitMode] = useState(false)
  const [editingPaletteColorIndex, setEditingPaletteColorIndex] = useState<number | null>(null)
  const [isRecentDialogOpen, setIsRecentDialogOpen] = useState(false)
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false)
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false)
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
  const { appSettings, setAppSettings } = useProjectBootstrap({ document, setDocument })

  const {
    openFileName,
    openFileInputRef,
    recentFiles,
    refreshRecentFiles,
    onDownloadFile,
    onNewDocument,
    onOpenDocument,
    onSaveAsDocument,
    onSaveDocument,
    onFileInputChange,
    onOpenRecentFile: onOpenRecentFileEntry,
    onDeleteRecentEntry,
  } = useDocumentFileActions({
    document,
    appSettings,
    dirty,
    setDocument,
    markSaved,
  })

  const onCloseMenus = useCallback(() => {
    setIsViewsMenuOpen(false)
    setIsColorMenuOpen(false)
    setIsBackgroundMenuOpen(false)
    setIsMobileActionsMenuOpen(false)
  }, [])

  usePointerDismiss({
    enabled: isViewsMenuOpen || isColorMenuOpen || isBackgroundMenuOpen || isMobileActionsMenuOpen,
    refs: dismissibleMenuRefs,
    onDismiss: onCloseMenus,
  })

  const width = document.model.rows[0]?.length ?? 0
  const height = document.model.rows.length
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

  const {
    selectionOverlay,
    linePreview,
    onDraftPointerDown,
    onPreviewPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    resetPointerPreview,
  } = usePointerEditing({
    selectedTool,
    selectedColor,
    selection,
    drawLine,
    fillLine,
    pickColorAt,
    toggleCell,
    setSelection,
    clearSelection,
  })

  const { draftScrollRef, correctedScrollRef, simulationScrollRef, sharedMaxScrollRow, onPaneScroll, applyZoomFit } = usePaneSync({
    rows: document.model.rows,
    height,
    zoomIndex,
    sharedScrollRow,
    isDraftVisible,
    isCorrectedVisible,
    isSimulationVisible,
    isReportVisible,
    isZoomFitMode,
    shift: document.view.shift,
    setViewScroll,
    setZoom,
  })

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

  const onDeleteSelection = useCallback(() => {
    resetPointerPreview()
    deleteSelection()
  }, [deleteSelection, resetPointerPreview])

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

  const onPrintDocument = useCallback(() => {
    window.print()
  }, [])

  const onOpenPreferencesDialog = useCallback(() => {
    setPreferencesAuthorInput(appSettings.defaultAuthor)
    setPreferencesOrganizationInput(appSettings.defaultOrganization)
    setPreferencesSymbolsInput(appSettings.symbols)
    setPageSetupSizeInput(appSettings.printPageSize)
    setPageSetupOrientationInput(appSettings.printOrientation)
    setIsPreferencesDialogOpen(true)
  }, [appSettings])

  const onOpenHelpDialog = useCallback(() => {
    setIsHelpDialogOpen(true)
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

  useMobilePortraitSinglePane({
    isDraftVisible,
    isCorrectedVisible,
    isSimulationVisible,
    isReportVisible,
    onSelectMobileView,
  })

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
      const opened = await onOpenRecentFileEntry(entry)
      if (opened) {
        setIsRecentDialogOpen(false)
      }
    },
    [onOpenRecentFileEntry],
  )

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

  const onCloseBlockingDialogs = useCallback(() => {
    setIsPreferencesDialogOpen(false)
    setIsHelpDialogOpen(false)
    setIsMobileActionsMenuOpen(false)
    setIsMetadataDialogOpen(false)
    setIsRecentDialogOpen(false)
    setIsArrangeDialogOpen(false)
    setIsPatternSizeDialogOpen(false)
  }, [])

  useBeforeUnloadGuard(dirty)

  const areMenusOpen = isViewsMenuOpen || isColorMenuOpen || isBackgroundMenuOpen || isMobileActionsMenuOpen
  const areBlockingDialogsOpen =
    isPreferencesDialogOpen ||
    isHelpDialogOpen ||
    isMobileActionsMenuOpen ||
    isMetadataDialogOpen ||
    isRecentDialogOpen ||
    isArrangeDialogOpen ||
    isPatternSizeDialogOpen

  useEditorShortcuts({
    areMenusOpen,
    areBlockingDialogsOpen,
    onCloseMenus,
    onCloseBlockingDialogs,
    onUndo: undo,
    onRedo: redo,
    onOpenPreferences: onOpenPreferencesDialog,
    onPrint: onPrintDocument,
    onSetZoomFitMode: setIsZoomFitMode,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onNewDocument,
    onOpenRecent: onOpenRecentDialog,
    onOpenDocument,
    onSaveAs: onSaveAsDocument,
    onSave: onSaveDocument,
    onSetSelectedTool: setSelectedTool,
    onDeleteSelection,
    onSetSelectedColor: setSelectedColor,
    onClearSelection: clearSelection,
    onOpenArrange: onOpenArrangeDialog,
    onShiftLeft: shiftLeft,
    onShiftRight: shiftRight,
  })

  return (
    <div className="app-shell">
      <AppHeader
        logoSrc={tsbeadLogoHorizontal}
        openFileName={openFileName}
        dirty={dirty}
        metadataLabel={metadataLabel}
        hasAnyPaneVisible={hasAnyPaneVisible}
        recentFilesCount={recentFiles.length}
        isMobileActionsMenuOpen={isMobileActionsMenuOpen}
        mobileActivePane={mobileActivePane}
        panes={VIEW_PANES}
        mobileActionsMenuRef={mobileActionsMenuRef}
        openFileInputRef={openFileInputRef}
        onToggleMobileActionsMenu={() => setIsMobileActionsMenuOpen((value) => !value)}
        onCloseMobileActionsMenu={() => setIsMobileActionsMenuOpen(false)}
        onSelectMobileView={onSelectMobileView}
        onNewDocument={onNewDocument}
        onOpenDocument={onOpenDocument}
        onOpenRecentDialog={onOpenRecentDialog}
        onSaveDocument={onSaveDocument}
        onSaveAsDocument={onSaveAsDocument}
        onDownloadFile={onDownloadFile}
        onPrintDocument={onPrintDocument}
        onOpenPreferencesDialog={onOpenPreferencesDialog}
        onOpenHelpDialog={onOpenHelpDialog}
        onOpenMetadataDialog={onOpenMetadataDialog}
        onFileInputChange={onFileInputChange}
      />

      <DesktopToolbar
        selectedTool={selectedTool}
        selectionExists={selection !== null}
        canRotate={canRotate}
        canUndo={canUndo}
        canRedo={canRedo}
        colors={document.colors}
        selectedColor={selectedColor}
        selectedColorValue={selectedColorValue}
        backgroundColorValue={backgroundColorValue}
        isBackgroundMenuOpen={isBackgroundMenuOpen}
        isColorMenuOpen={isColorMenuOpen}
        isViewsMenuOpen={isViewsMenuOpen}
        paneVisibilityById={paneVisibilityById}
        panes={VIEW_PANES}
        drawColors={drawColors}
        drawSymbols={drawSymbols}
        canZoomOut={canZoomOut}
        canZoomIn={canZoomIn}
        isZoomFitMode={isZoomFitMode}
        hasCanvasPaneVisible={hasCanvasPaneVisible}
        backgroundMenuRef={backgroundMenuRef}
        colorMenuRef={colorMenuRef}
        viewsMenuRef={viewsMenuRef}
        colorToCss={colorToCss}
        onSetSelectedTool={setSelectedTool}
        onToggleBackgroundMenu={() => {
          setIsBackgroundMenuOpen((value) => !value)
          setIsColorMenuOpen(false)
          setIsViewsMenuOpen(false)
        }}
        onToggleColorMenu={() => {
          setIsColorMenuOpen((value) => !value)
          setIsBackgroundMenuOpen(false)
          setIsViewsMenuOpen(false)
        }}
        onSetColorAsBackground={setColorAsBackground}
        onSetSelectedColor={setSelectedColor}
        onEditPaletteColor={onEditPaletteColor}
        onDeleteSelection={onDeleteSelection}
        onOpenArrangeDialog={onOpenArrangeDialog}
        onInsertRow={() => insertRow()}
        onDeleteRow={() => deleteRow()}
        onMirrorHorizontal={() => mirrorHorizontal()}
        onMirrorVertical={() => mirrorVertical()}
        onRotateClockwise={() => rotateClockwise()}
        onUndo={() => undo()}
        onRedo={() => redo()}
        onToggleViewsMenu={() => {
          setIsViewsMenuOpen((value) => !value)
          setIsColorMenuOpen(false)
          setIsBackgroundMenuOpen(false)
        }}
        onSetViewVisibility={setViewVisibility}
        onOpenPatternSizeDialog={onOpenPatternSizeDialog}
        onZoomOut={() => {
          setIsZoomFitMode(false)
          zoomOut()
        }}
        onZoomFit={() => {
          setIsZoomFitMode(true)
          applyZoomFit()
        }}
        onZoomIn={() => {
          setIsZoomFitMode(false)
          zoomIn()
        }}
        onShiftLeft={() => shiftLeft()}
        onShiftRight={() => shiftRight()}
        onSetDrawColors={setDrawColors}
        onSetDrawSymbols={setDrawSymbols}
      />

      <main className="workspace">
        <MobileEditRail
          selectedTool={selectedTool}
          selectionExists={selection !== null}
          canRotate={canRotate}
          canUndo={canUndo}
          canRedo={canRedo}
          colors={document.colors}
          selectedColor={selectedColor}
          selectedColorValue={selectedColorValue}
          backgroundColorValue={backgroundColorValue}
          isBackgroundMenuOpen={isBackgroundMenuOpen}
          isColorMenuOpen={isColorMenuOpen}
          mobileBackgroundMenuRef={mobileBackgroundMenuRef}
          mobileColorMenuRef={mobileColorMenuRef}
          colorToCss={colorToCss}
          onSetSelectedTool={setSelectedTool}
          onToggleBackgroundMenu={() => {
            setIsBackgroundMenuOpen((value) => !value)
            setIsColorMenuOpen(false)
            setIsViewsMenuOpen(false)
          }}
          onToggleColorMenu={() => {
            setIsColorMenuOpen((value) => !value)
            setIsBackgroundMenuOpen(false)
            setIsViewsMenuOpen(false)
          }}
          onSetColorAsBackground={setColorAsBackground}
          onSetSelectedColor={setSelectedColor}
          onEditPaletteColor={onEditPaletteColor}
          onDeleteSelection={onDeleteSelection}
          onOpenArrangeDialog={onOpenArrangeDialog}
          onInsertRow={() => insertRow()}
          onDeleteRow={() => deleteRow()}
          onMirrorHorizontal={() => mirrorHorizontal()}
          onMirrorVertical={() => mirrorVertical()}
          onRotateClockwise={() => rotateClockwise()}
          onUndo={() => undo()}
          onRedo={() => redo()}
        />

        <WorkspacePanels
          hasCanvasPaneVisible={hasCanvasPaneVisible}
          hasAnyPaneVisible={hasAnyPaneVisible}
          isReportVisible={isReportVisible}
          isDraftVisible={isDraftVisible}
          isCorrectedVisible={isCorrectedVisible}
          isSimulationVisible={isSimulationVisible}
          width={width}
          height={height}
          document={document}
          selectionOverlay={selectionOverlay}
          linePreview={linePreview}
          draftScrollRef={draftScrollRef}
          correctedScrollRef={correctedScrollRef}
          simulationScrollRef={simulationScrollRef}
          sharedMaxScrollRow={sharedMaxScrollRow}
          sharedScrollRow={sharedScrollRow}
          reportSummary={reportSummary}
          visibleColorCounts={visibleColorCounts}
          colorToCss={colorToCss}
          onPaneScroll={onPaneScroll}
          onSharedScrollChange={setViewScroll}
          onDraftPointerDown={onDraftPointerDown}
          onPreviewPointerDown={onPreviewPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        />
      </main>

      <input
        ref={paletteColorPickerRef}
        className="palette-color-picker"
        type="color"
        value={colorToHex(document.colors[editingPaletteColorIndex ?? selectedColor] ?? document.colors[0] ?? [0, 0, 0, 255])}
        onChange={(event) => onPaletteColorPicked(event.currentTarget.value)}
        onBlur={() => setEditingPaletteColorIndex(null)}
      />

      <PrintWorkspace
        isReportVisible={isReportVisible}
        isDraftVisible={isDraftVisible}
        isCorrectedVisible={isCorrectedVisible}
        isSimulationVisible={isSimulationVisible}
        height={height}
        printChunks={printChunks}
        document={document}
        reportSummary={reportSummary}
        visibleColorCounts={visibleColorCounts}
        colorToCss={colorToCss}
        formatChunkLabel={formatLegacyChunkLabel}
      />

      <MetadataDialog
        isOpen={isMetadataDialogOpen}
        author={metadataAuthorInput}
        organization={metadataOrganizationInput}
        notes={metadataNotesInput}
        onAuthorChange={setMetadataAuthorInput}
        onOrganizationChange={setMetadataOrganizationInput}
        onNotesChange={setMetadataNotesInput}
        onApply={onApplyMetadata}
        onClose={() => setIsMetadataDialogOpen(false)}
      />

      <PreferencesDialog
        isOpen={isPreferencesDialogOpen}
        defaultAuthor={preferencesAuthorInput}
        defaultOrganization={preferencesOrganizationInput}
        symbols={preferencesSymbolsInput}
        pageSize={pageSetupSizeInput}
        orientation={pageSetupOrientationInput}
        onDefaultAuthorChange={setPreferencesAuthorInput}
        onDefaultOrganizationChange={setPreferencesOrganizationInput}
        onSymbolsChange={setPreferencesSymbolsInput}
        onPageSizeChange={setPageSetupSizeInput}
        onOrientationChange={setPageSetupOrientationInput}
        onApply={() => void onApplyPreferences()}
        onClose={() => setIsPreferencesDialogOpen(false)}
      />

      <HelpDialog isOpen={isHelpDialogOpen} onClose={() => setIsHelpDialogOpen(false)} />

      <RecentFilesDialog
        isOpen={isRecentDialogOpen}
        recentFiles={recentFiles}
        formatTimestamp={formatRecentTimestamp}
        onOpenRecentFile={onOpenRecentFile}
        onDeleteRecentEntry={onDeleteRecentEntry}
        onClose={() => setIsRecentDialogOpen(false)}
      />

      <PatternSizeDialog
        isOpen={isPatternSizeDialogOpen}
        widthInput={patternWidthInput}
        heightInput={patternHeightInput}
        minWidth={MIN_PATTERN_WIDTH}
        maxWidth={MAX_PATTERN_WIDTH}
        minHeight={MIN_PATTERN_HEIGHT}
        maxHeight={MAX_PATTERN_HEIGHT}
        onWidthChange={setPatternWidthInput}
        onHeightChange={setPatternHeightInput}
        onApply={onApplyPatternSize}
        onClose={() => setIsPatternSizeDialogOpen(false)}
      />

      <ArrangeDialog
        isOpen={isArrangeDialogOpen}
        horizontalOffset={arrangeHorizontalOffset}
        verticalOffset={arrangeVerticalOffset}
        copies={arrangeCopies}
        onHorizontalOffsetChange={setArrangeHorizontalOffset}
        onVerticalOffsetChange={setArrangeVerticalOffset}
        onCopiesChange={setArrangeCopies}
        onApply={onApplyArrange}
        onClose={() => setIsArrangeDialogOpen(false)}
      />
    </div>
  )
}

export default App
