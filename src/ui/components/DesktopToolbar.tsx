import type { RefObject } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Eraser,
  LayoutGrid,
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
  Slash,
  SquareDashed,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { JBeadDocument, RgbaColor, ToolId, ViewPaneId } from '../../domain/types'
import { usePlatformShortcuts } from '../hooks/usePlatformShortcuts'

interface ViewPaneEntry {
  id: ViewPaneId
  label: string
}

interface DesktopToolbarProps {
  selectedTool: ToolId
  selectionExists: boolean
  canRotate: boolean
  canUndo: boolean
  canRedo: boolean
  colors: JBeadDocument['colors']
  selectedColor: number
  selectedColorValue: RgbaColor
  backgroundColorValue: RgbaColor
  isBackgroundMenuOpen: boolean
  isColorMenuOpen: boolean
  isViewsMenuOpen: boolean
  paneVisibilityById: Record<ViewPaneId, boolean>
  panes: ViewPaneEntry[]
  drawColors: boolean
  drawSymbols: boolean
  canZoomOut: boolean
  canZoomIn: boolean
  isZoomFitMode: boolean
  hasCanvasPaneVisible: boolean
  backgroundMenuRef: RefObject<HTMLDivElement | null>
  colorMenuRef: RefObject<HTMLDivElement | null>
  viewsMenuRef: RefObject<HTMLDivElement | null>
  colorToCss: (color: RgbaColor) => string
  onSetSelectedTool: (tool: ToolId) => void
  onToggleBackgroundMenu: () => void
  onToggleColorMenu: () => void
  onSetColorAsBackground: (index: number) => void
  onSetSelectedColor: (index: number) => void
  onEditPaletteColor: (index: number) => void
  onDeleteSelection: () => void
  onOpenArrangeDialog: () => void
  onInsertRow: () => void
  onDeleteRow: () => void
  onMirrorHorizontal: () => void
  onMirrorVertical: () => void
  onRotateClockwise: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleViewsMenu: () => void
  onSetViewVisibility: (pane: ViewPaneId, visible: boolean) => void
  onOpenPatternSizeDialog: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onZoomIn: () => void
  onShiftLeft: () => void
  onShiftRight: () => void
  onSetDrawColors: (value: boolean) => void
  onSetDrawSymbols: (value: boolean) => void
}

export function DesktopToolbar({
  selectedTool,
  selectionExists,
  canRotate,
  canUndo,
  canRedo,
  colors,
  selectedColor,
  selectedColorValue,
  backgroundColorValue,
  isBackgroundMenuOpen,
  isColorMenuOpen,
  isViewsMenuOpen,
  paneVisibilityById,
  panes,
  drawColors,
  drawSymbols,
  canZoomOut,
  canZoomIn,
  isZoomFitMode,
  hasCanvasPaneVisible,
  backgroundMenuRef,
  colorMenuRef,
  viewsMenuRef,
  colorToCss,
  onSetSelectedTool,
  onToggleBackgroundMenu,
  onToggleColorMenu,
  onSetColorAsBackground,
  onSetSelectedColor,
  onEditPaletteColor,
  onDeleteSelection,
  onOpenArrangeDialog,
  onInsertRow,
  onDeleteRow,
  onMirrorHorizontal,
  onMirrorVertical,
  onRotateClockwise,
  onUndo,
  onRedo,
  onToggleViewsMenu,
  onSetViewVisibility,
  onOpenPatternSizeDialog,
  onZoomOut,
  onZoomFit,
  onZoomIn,
  onShiftLeft,
  onShiftRight,
  onSetDrawColors,
  onSetDrawSymbols,
}: DesktopToolbarProps) {
  const shortcuts = usePlatformShortcuts()

  return (
    <section className="panel tools-panel">
      <div className="toolbar-layout">
        <div className="toolbar-side toolbar-edit">
          <div className="button-strip toolbar-group">
            <button
              className={`action icon-action tool-action ${selectedTool === 'pencil' ? 'active' : ''}`}
              onClick={() => onSetSelectedTool('pencil')}
              title={shortcuts.pencil}
              aria-label="Pencil"
            >
              <Pencil className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'line' ? 'active' : ''}`}
              onClick={() => onSetSelectedTool('line')}
              title={shortcuts.line}
              aria-label="Line"
            >
              <Slash className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'fill' ? 'active' : ''}`}
              onClick={() => onSetSelectedTool('fill')}
              title={shortcuts.fill}
              aria-label="Fill"
            >
              <PaintBucket className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action tool-action ${selectedTool === 'pipette' ? 'active' : ''}`}
              onClick={() => onSetSelectedTool('pipette')}
              title={shortcuts.pipette}
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
                onClick={onToggleBackgroundMenu}
                title="Background color"
                aria-label="Background color"
              >
                <span className="color-toggle-label">BG</span>
                <span className="color-toggle-chip" style={{ backgroundColor: colorToCss(backgroundColorValue) }} />
              </button>
              {isBackgroundMenuOpen ? (
                <div className="palette-menu">
                  <div className="palette-menu-grid">
                    {colors.map((color, index) => (
                      <button
                        key={`background-color-${color.join('-')}-${index}`}
                        className={`swatch palette-menu-swatch ${index === 0 ? 'selected' : ''}`}
                        style={{ backgroundColor: colorToCss(color) }}
                        onClick={() => onSetColorAsBackground(index)}
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
                onClick={onToggleColorMenu}
                title="Drawing color"
                aria-label="Drawing color"
              >
                <span className="color-toggle-label">Color</span>
                <span className="color-toggle-chip" style={{ backgroundColor: colorToCss(selectedColorValue) }} />
              </button>
              {isColorMenuOpen ? (
                <div className="palette-menu">
                  <div className="palette-menu-grid">
                    {colors.map((color, index) => (
                      <button
                        key={`selected-color-${color.join('-')}-${index}`}
                        className={`swatch palette-menu-swatch ${selectedColor === index ? 'selected' : ''}`}
                        style={{ backgroundColor: colorToCss(color) }}
                        onClick={() => onSetSelectedColor(index)}
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
              onClick={() => onSetSelectedTool('select')}
              title={shortcuts.select}
              aria-label="Select"
            >
              <SquareDashed className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className="action icon-action"
              onClick={onDeleteSelection}
              disabled={!selectionExists}
              title={shortcuts.deleteSelection}
              aria-label="Delete selection"
            >
              <Eraser className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onOpenArrangeDialog} disabled={!selectionExists} title={shortcuts.arrange} aria-label="Arrange">
              <Copy className="tool-icon" aria-hidden="true" />
            </button>
          </div>

          <span className="toolbar-separator" aria-hidden="true" />

          <div className="button-strip toolbar-group">
            <button className="action icon-action" onClick={onInsertRow} title="Insert row" aria-label="Insert row">
              <Plus className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onDeleteRow} title="Delete row" aria-label="Delete row">
              <Minus className="tool-icon" aria-hidden="true" />
            </button>
          </div>

          <span className="toolbar-separator" aria-hidden="true" />

          <div className="button-strip toolbar-group">
            <button className="action icon-action" onClick={onMirrorHorizontal} title="Mirror horizontal" aria-label="Mirror horizontal">
              <MoveHorizontal className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onMirrorVertical} title="Mirror vertical" aria-label="Mirror vertical">
              <MoveVertical className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onRotateClockwise} disabled={!canRotate} title="Rotate 90" aria-label="Rotate 90">
              <RotateCw className="tool-icon" aria-hidden="true" />
            </button>
          </div>

          <span className="toolbar-separator" aria-hidden="true" />

          <div className="button-strip toolbar-group">
            <button className="action icon-action" onClick={onUndo} disabled={!canUndo} title={shortcuts.undo} aria-label="Undo">
              <Undo2 className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onRedo} disabled={!canRedo} title={shortcuts.redo} aria-label="Redo">
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
                onClick={onToggleViewsMenu}
              >
                Views
              </button>
              {isViewsMenuOpen ? (
                <div className="views-menu">
                  {panes.map((pane) => {
                    const visible = paneVisibilityById[pane.id]
                    return (
                      <label key={pane.id} className="views-menu-item">
                        <input type="checkbox" checked={visible} onChange={() => onSetViewVisibility(pane.id, !visible)} />
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
            <button className="action icon-action" onClick={onZoomOut} disabled={!canZoomOut} title={shortcuts.zoomOut} aria-label="Zoom out">
              <ZoomOut className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action ${isZoomFitMode ? 'view-toggle active' : ''}`}
              onClick={onZoomFit}
              disabled={!hasCanvasPaneVisible}
              title="Zoom 100%"
              aria-label="Zoom 100%"
            >
              <Scan className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onZoomIn} disabled={!canZoomIn} title={shortcuts.zoomIn} aria-label="Zoom in">
              <ZoomIn className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onShiftLeft} title={shortcuts.shiftLeft} aria-label="Shift left">
              <ArrowLeft className="tool-icon" aria-hidden="true" />
            </button>
            <button className="action icon-action" onClick={onShiftRight} title={shortcuts.shiftRight} aria-label="Shift right">
              <ArrowRight className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action view-toggle ${drawColors ? 'active' : ''}`}
              aria-pressed={drawColors}
              onClick={() => onSetDrawColors(!drawColors)}
              title="Draw colors"
              aria-label="Draw colors"
            >
              <Palette className="tool-icon" aria-hidden="true" />
            </button>
            <button
              className={`action icon-action view-toggle ${drawSymbols ? 'active' : ''}`}
              aria-pressed={drawSymbols}
              onClick={() => onSetDrawSymbols(!drawSymbols)}
              title="Draw symbols"
              aria-label="Draw symbols"
            >
              <Type className="tool-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
