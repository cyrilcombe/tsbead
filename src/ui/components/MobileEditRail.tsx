import type { RefObject } from 'react'
import {
  Copy,
  Eraser,
  Minus,
  MoveHorizontal,
  MoveVertical,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RotateCw,
  Slash,
  SquareDashed,
  Undo2,
} from 'lucide-react'
import type { JBeadDocument, ToolId } from '../../domain/types'
import { usePlatformShortcuts } from '../hooks/usePlatformShortcuts'

interface MobileEditRailProps {
  selectedTool: ToolId
  selectionExists: boolean
  canRotate: boolean
  canUndo: boolean
  canRedo: boolean
  colors: JBeadDocument['colors']
  selectedColor: number
  selectedColorValue: [number, number, number, number?]
  backgroundColorValue: [number, number, number, number?]
  isBackgroundMenuOpen: boolean
  isColorMenuOpen: boolean
  mobileBackgroundMenuRef: RefObject<HTMLDivElement | null>
  mobileColorMenuRef: RefObject<HTMLDivElement | null>
  colorToCss: (color: [number, number, number, number?]) => string
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
}

export function MobileEditRail({
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
  mobileBackgroundMenuRef,
  mobileColorMenuRef,
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
}: MobileEditRailProps) {
  const shortcuts = usePlatformShortcuts()

  return (
    <aside className="panel mobile-edit-rail" aria-label="Editing tools">
      <div className="mobile-edit-group">
        <button className={`action icon-action tool-action ${selectedTool === 'pencil' ? 'active' : ''}`} onClick={() => onSetSelectedTool('pencil')} title={shortcuts.pencil} aria-label="Pencil">
          <Pencil className="tool-icon" aria-hidden="true" />
        </button>
        <button className={`action icon-action tool-action ${selectedTool === 'line' ? 'active' : ''}`} onClick={() => onSetSelectedTool('line')} title={shortcuts.line} aria-label="Line">
          <Slash className="tool-icon" aria-hidden="true" />
        </button>
        <button className={`action icon-action tool-action ${selectedTool === 'fill' ? 'active' : ''}`} onClick={() => onSetSelectedTool('fill')} title={shortcuts.fill} aria-label="Fill">
          <PaintBucket className="tool-icon" aria-hidden="true" />
        </button>
        <button className={`action icon-action tool-action ${selectedTool === 'pipette' ? 'active' : ''}`} onClick={() => onSetSelectedTool('pipette')} title={shortcuts.pipette} aria-label="Pipette">
          <Pipette className="tool-icon" aria-hidden="true" />
        </button>
        <button className={`action icon-action tool-action ${selectedTool === 'select' ? 'active' : ''}`} onClick={() => onSetSelectedTool('select')} title={shortcuts.select} aria-label="Select">
          <SquareDashed className="tool-icon" aria-hidden="true" />
        </button>
      </div>

      <span className="mobile-edit-separator" aria-hidden="true" />

      <div className="mobile-edit-group">
        <div className="palette-menu-wrap compact-color-wrap" ref={mobileBackgroundMenuRef}>
          <button className={`action icon-action compact-color-toggle ${isBackgroundMenuOpen ? 'view-toggle active' : ''}`} onClick={onToggleBackgroundMenu} title="Background color" aria-label="Background color">
            <span className="compact-color-label">BG</span>
            <span className="compact-color-chip" style={{ backgroundColor: colorToCss(backgroundColorValue) }} />
          </button>
          {isBackgroundMenuOpen ? (
            <div className="palette-menu compact-palette-menu">
              <div className="palette-menu-grid">
                {colors.map((color, index) => (
                  <button
                    key={`mobile-background-color-${color.join('-')}-${index}`}
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

        <div className="palette-menu-wrap compact-color-wrap" ref={mobileColorMenuRef}>
          <button className={`action icon-action compact-color-toggle ${isColorMenuOpen ? 'view-toggle active' : ''}`} onClick={onToggleColorMenu} title="Drawing color" aria-label="Drawing color">
            <span className="compact-color-label">C</span>
            <span className="compact-color-chip" style={{ backgroundColor: colorToCss(selectedColorValue) }} />
          </button>
          {isColorMenuOpen ? (
            <div className="palette-menu compact-palette-menu">
              <div className="palette-menu-grid">
                {colors.map((color, index) => (
                  <button
                    key={`mobile-selected-color-${color.join('-')}-${index}`}
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

      <span className="mobile-edit-separator" aria-hidden="true" />

      <div className="mobile-edit-group mobile-edit-group-scroll">
        <button className="action icon-action" onClick={onUndo} disabled={!canUndo} title={shortcuts.undo} aria-label="Undo">
          <Undo2 className="tool-icon" aria-hidden="true" />
        </button>
        <button className="action icon-action" onClick={onRedo} disabled={!canRedo} title={shortcuts.redo} aria-label="Redo">
          <Redo2 className="tool-icon" aria-hidden="true" />
        </button>
        <button className="action icon-action" onClick={onDeleteSelection} disabled={!selectionExists} title={shortcuts.deleteSelection} aria-label="Delete selection">
          <Eraser className="tool-icon" aria-hidden="true" />
        </button>
        <button className="action icon-action" onClick={onOpenArrangeDialog} disabled={!selectionExists} title={shortcuts.arrange} aria-label="Arrange">
          <Copy className="tool-icon" aria-hidden="true" />
        </button>
        <button className="action icon-action" onClick={onInsertRow} title="Insert row" aria-label="Insert row">
          <Plus className="tool-icon" aria-hidden="true" />
        </button>
        <button className="action icon-action" onClick={onDeleteRow} title="Delete row" aria-label="Delete row">
          <Minus className="tool-icon" aria-hidden="true" />
        </button>
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
    </aside>
  )
}
