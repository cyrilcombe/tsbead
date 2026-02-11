import { useEffect, useRef } from 'react'
import type { ToolId } from '../../domain/types'

interface UseEditorShortcutsOptions {
  areMenusOpen: boolean
  areBlockingDialogsOpen: boolean
  onCloseMenus: () => void
  onCloseBlockingDialogs: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenPreferences: () => void
  onPrint: () => void
  onSetZoomFitMode: (value: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onNewDocument: () => boolean
  onOpenRecent: () => void
  onOpenDocument: () => Promise<void>
  onSaveAs: () => Promise<boolean>
  onSave: () => Promise<boolean>
  onSetSelectedTool: (tool: ToolId) => void
  onDeleteSelection: () => void
  onSetSelectedColor: (index: number) => void
  onClearSelection: () => void
  onOpenArrange: () => void
  onShiftLeft: () => void
  onShiftRight: () => void
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

export function useEditorShortcuts({
  areMenusOpen,
  areBlockingDialogsOpen,
  onCloseMenus,
  onCloseBlockingDialogs,
  onUndo,
  onRedo,
  onOpenPreferences,
  onPrint,
  onSetZoomFitMode,
  onZoomIn,
  onZoomOut,
  onNewDocument,
  onOpenRecent,
  onOpenDocument,
  onSaveAs,
  onSave,
  onSetSelectedTool,
  onDeleteSelection,
  onSetSelectedColor,
  onClearSelection,
  onOpenArrange,
  onShiftLeft,
  onShiftRight,
}: UseEditorShortcutsOptions) {
  const isSpaceToolActiveRef = useRef(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (areMenusOpen && event.key === 'Escape') {
        onCloseMenus()
        event.preventDefault()
        return
      }

      if (areBlockingDialogsOpen) {
        if (event.key === 'Escape') {
          onCloseBlockingDialogs()
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
            onRedo()
          } else {
            onUndo()
          }
          handled = true
        } else if (lowerKey === 'y') {
          onRedo()
          handled = true
        } else if (lowerKey === 'p' && event.shiftKey) {
          onOpenPreferences()
          handled = true
        } else if (lowerKey === 'p' && !event.shiftKey) {
          onPrint()
          handled = true
        } else if (event.code === 'Comma' && !event.shiftKey) {
          onOpenPreferences()
          handled = true
        } else if (lowerKey === 'i' && !event.shiftKey) {
          onSetZoomFitMode(false)
          onZoomIn()
          handled = true
        } else if (lowerKey === 'u' && !event.shiftKey) {
          onSetZoomFitMode(false)
          onZoomOut()
          handled = true
        } else if (lowerKey === 'n' && !event.shiftKey) {
          onNewDocument()
          handled = true
        } else if (lowerKey === 'o') {
          if (event.shiftKey) {
            onOpenRecent()
          } else {
            void onOpenDocument()
          }
          handled = true
        } else if (lowerKey === 's') {
          if (event.shiftKey) {
            void onSaveAs()
          } else {
            void onSave()
          }
          handled = true
        } else {
          const shortcut = shortcutFromKeyboardCode(event.code)
          if (shortcut === 1 && !event.shiftKey) {
            onSetSelectedTool('pencil')
            handled = true
          } else if (shortcut === 2 && !event.shiftKey) {
            onSetSelectedTool('line')
            handled = true
          } else if (shortcut === 3 && !event.shiftKey) {
            onSetSelectedTool('fill')
            handled = true
          } else if (shortcut === 4 && !event.shiftKey) {
            onSetSelectedTool('select')
            handled = true
          } else if (shortcut === 5 && !event.shiftKey) {
            onDeleteSelection()
            handled = true
          } else if (shortcut === 6 && !event.shiftKey) {
            onSetSelectedTool('pipette')
            handled = true
          }
        }
      } else if (!event.altKey) {
        const colorFromCode = colorFromKeyboardCode(event.code)
        if (colorFromCode !== null) {
          onSetSelectedColor(colorFromCode)
          handled = true
        } else if (event.key === 'Escape') {
          onClearSelection()
          handled = true
        } else if (event.code === 'Space') {
          if (!event.repeat) {
            isSpaceToolActiveRef.current = true
            onSetSelectedTool('pipette')
          }
          handled = true
        } else if (event.key === 'F8') {
          onOpenArrange()
          handled = true
        } else if (event.key >= '0' && event.key <= '9') {
          onSetSelectedColor(Number(event.key))
          handled = true
        } else if (event.key === 'ArrowLeft') {
          onShiftLeft()
          handled = true
        } else if (event.key === 'ArrowRight') {
          onShiftRight()
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
        onSetSelectedTool('pencil')
        event.preventDefault()
      }
    }

    const onBlur = () => {
      if (!isSpaceToolActiveRef.current) {
        return
      }
      isSpaceToolActiveRef.current = false
      onSetSelectedTool('pencil')
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
    areBlockingDialogsOpen,
    areMenusOpen,
    onClearSelection,
    onCloseBlockingDialogs,
    onCloseMenus,
    onDeleteSelection,
    onNewDocument,
    onOpenArrange,
    onOpenDocument,
    onOpenPreferences,
    onOpenRecent,
    onPrint,
    onRedo,
    onSave,
    onSaveAs,
    onSetSelectedColor,
    onSetSelectedTool,
    onSetZoomFitMode,
    onShiftLeft,
    onShiftRight,
    onUndo,
    onZoomIn,
    onZoomOut,
  ])
}
