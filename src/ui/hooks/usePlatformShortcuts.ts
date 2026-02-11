import { useMemo } from 'react'

interface ShortcutTitles {
  newDocument: string
  openDocument: string
  openRecent: string
  save: string
  saveAs: string
  print: string
  preferences: string
  pencil: string
  line: string
  fill: string
  pipette: string
  select: string
  deleteSelection: string
  arrange: string
  undo: string
  redo: string
  zoomIn: string
  zoomOut: string
  shiftLeft: string
  shiftRight: string
}

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  const uaDataPlatform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? ''
  const fingerprint = `${navigator.platform ?? ''} ${navigator.userAgent ?? ''} ${uaDataPlatform}`.toLowerCase()
  return fingerprint.includes('mac') || fingerprint.includes('iphone') || fingerprint.includes('ipad') || fingerprint.includes('ipod')
}

function withShortcut(label: string, shortcut: string): string {
  return `${label} (${shortcut})`
}

export function usePlatformShortcuts(): ShortcutTitles {
  return useMemo(() => {
    const isApple = isApplePlatform()
    const modifier = isApple ? 'Cmd' : 'Ctrl'
    const redoShortcut = isApple ? 'Cmd+Shift+Z' : 'Ctrl+Y / Ctrl+Shift+Z'
    const preferencesShortcut = isApple ? 'Cmd+, / Cmd+Shift+P' : 'Ctrl+, / Ctrl+Shift+P'

    return {
      newDocument: withShortcut('New', `${modifier}+N`),
      openDocument: withShortcut('Open...', `${modifier}+O`),
      openRecent: withShortcut('Open recent...', `${modifier}+Shift+O`),
      save: withShortcut('Save', `${modifier}+S`),
      saveAs: withShortcut('Save As...', `${modifier}+Shift+S`),
      print: withShortcut('Print...', `${modifier}+P`),
      preferences: withShortcut('Preferences...', preferencesShortcut),
      pencil: withShortcut('Pencil', `${modifier}+1`),
      line: withShortcut('Line', `${modifier}+2`),
      fill: withShortcut('Fill', `${modifier}+3`),
      pipette: withShortcut('Pipette', `${modifier}+6`),
      select: withShortcut('Select', `${modifier}+4`),
      deleteSelection: withShortcut('Delete selection', `${modifier}+5`),
      arrange: withShortcut('Arrange...', 'F8'),
      undo: withShortcut('Undo', `${modifier}+Z`),
      redo: withShortcut('Redo', redoShortcut),
      zoomIn: withShortcut('Zoom in', `${modifier}+I`),
      zoomOut: withShortcut('Zoom out', `${modifier}+U`),
      shiftLeft: withShortcut('Shift left', 'ArrowLeft'),
      shiftRight: withShortcut('Shift right', 'ArrowRight'),
    }
  }, [])
}
