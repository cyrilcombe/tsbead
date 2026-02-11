import { useMemo } from 'react'
import { useI18n } from '../../i18n/I18nProvider'

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
  const { t } = useI18n()

  return useMemo(() => {
    const isApple = isApplePlatform()
    const modifier = isApple ? 'Cmd' : 'Ctrl'
    const redoShortcut = isApple ? 'Cmd+Shift+Z' : 'Ctrl+Y / Ctrl+Shift+Z'
    const preferencesShortcut = isApple ? 'Cmd+, / Cmd+Shift+P' : 'Ctrl+, / Ctrl+Shift+P'

    return {
      newDocument: withShortcut(t('action.new'), `${modifier}+N`),
      openDocument: withShortcut(t('action.open'), `${modifier}+O`),
      openRecent: withShortcut(t('action.openRecent'), `${modifier}+Shift+O`),
      save: withShortcut(t('action.save'), `${modifier}+S`),
      saveAs: withShortcut(t('action.saveAs'), `${modifier}+Shift+S`),
      print: withShortcut(t('action.print'), `${modifier}+P`),
      preferences: withShortcut(t('action.preferences'), preferencesShortcut),
      pencil: withShortcut(t('tool.pencil'), `${modifier}+1`),
      line: withShortcut(t('tool.line'), `${modifier}+2`),
      fill: withShortcut(t('tool.fill'), `${modifier}+3`),
      pipette: withShortcut(t('tool.pipette'), `${modifier}+6`),
      select: withShortcut(t('tool.select'), `${modifier}+4`),
      deleteSelection: withShortcut(t('tool.deleteSelection'), `${modifier}+5`),
      arrange: withShortcut(`${t('tool.arrange')}...`, 'F8'),
      undo: withShortcut(t('tool.undo'), `${modifier}+Z`),
      redo: withShortcut(t('tool.redo'), redoShortcut),
      zoomIn: withShortcut(t('tool.zoomIn'), `${modifier}+I`),
      zoomOut: withShortcut(t('tool.zoomOut'), `${modifier}+U`),
      shiftLeft: withShortcut(t('tool.shiftLeft'), 'ArrowLeft'),
      shiftRight: withShortcut(t('tool.shiftRight'), 'ArrowRight'),
    }
  }, [t])
}
