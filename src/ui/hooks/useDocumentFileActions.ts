import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createEmptyDocument } from '../../domain/defaults'
import { parseJbb, serializeJbb } from '../../io/jbb/format'
import type { TranslateFn } from '../../i18n/I18nProvider'
import {
  deleteRecentFile,
  listRecentFiles,
  saveRecentFile,
  type AppSettings,
  type RecentFileRecord,
} from '../../storage/db'
import type { JBeadDocument } from '../../domain/types'

const DEFAULT_FILE_NAME = 'design.jbb'
const JBB_FILE_PICKER_ACCEPT = {
  'application/x-jbb': ['.jbb'],
  'text/plain': ['.jbb'],
}
const RECENT_FILES_LIMIT = 8

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

interface UseDocumentFileActionsOptions {
  document: JBeadDocument
  appSettings: AppSettings
  dirty: boolean
  setDocument: (document: JBeadDocument) => void
  markSaved: () => void
  t: TranslateFn
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
  return new Blob([content], { type: 'application/x-jbb' })
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

export function useDocumentFileActions({
  document,
  appSettings,
  dirty,
  setDocument,
  markSaved,
  t,
}: UseDocumentFileActionsOptions) {
  const openFileInputRef = useRef<HTMLInputElement | null>(null)
  const [openFileName, setOpenFileName] = useState(DEFAULT_FILE_NAME)
  const [openFileHandle, setOpenFileHandle] = useState<FileSystemFileHandleLike | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([])

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

  const onDownloadFile = useCallback(
    (fileName: string) => {
      const blob = createJbbBlob(document)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = ensureJbbFileName(fileName)
      link.rel = 'noopener'
      link.style.display = 'none'
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
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
        window.alert(t('error.openFile', { error: getErrorMessage(error, t('error.unexpected')) }))
      }
    },
    [refreshRecentFiles, setDocument, t],
  )

  const onDiscardUnsavedChanges = useCallback((): boolean => {
    if (!dirty) {
      return true
    }
    return window.confirm(t('confirm.discardUnsaved'))
  }, [dirty, t])

  const onNewDocument = useCallback((): boolean => {
    if (!onDiscardUnsavedChanges()) {
      return false
    }
    setDocument(
      createEmptyDocument(15, 120, {
        author: appSettings.defaultAuthor,
        organization: appSettings.defaultOrganization,
        symbols: appSettings.symbols,
      }),
    )
    setOpenFileHandle(null)
    setOpenFileName(DEFAULT_FILE_NAME)
    return true
  }, [appSettings.defaultAuthor, appSettings.defaultOrganization, appSettings.symbols, onDiscardUnsavedChanges, setDocument])

  const onOpenDocument = useCallback(async (): Promise<void> => {
    if (!onDiscardUnsavedChanges()) {
      return
    }

    const pickerWindow = window as WindowWithFilePicker
    if (pickerWindow.showOpenFilePicker) {
      try {
        const handles = await pickerWindow.showOpenFilePicker({
          multiple: false,
          types: [{ description: t('picker.jbeadFiles'), accept: JBB_FILE_PICKER_ACCEPT }],
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
        window.alert(t('error.openFile', { error: getErrorMessage(error, t('error.unexpected')) }))
      }
      return
    }

    openFileInputRef.current?.click()
  }, [onDiscardUnsavedChanges, onLoadFile, t])

  const onSaveAsDocument = useCallback(async (): Promise<boolean> => {
    const targetFileName = ensureJbbFileName(openFileName)
    const serializedContent = serializeJbb(document)
    const pickerWindow = window as WindowWithFilePicker
    if (pickerWindow.showSaveFilePicker) {
      try {
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: targetFileName,
          types: [{ description: t('picker.jbeadFiles'), accept: JBB_FILE_PICKER_ACCEPT }],
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
        window.alert(t('error.saveFile', { error: getErrorMessage(error, t('error.unexpected')) }))
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
  }, [document, markSaved, onDownloadFile, openFileName, refreshRecentFiles, t])

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
      window.alert(t('error.saveFile', { error: getErrorMessage(error, t('error.unexpected')) }))
      return false
    }
  }, [document, markSaved, onSaveAsDocument, openFileHandle, openFileName, refreshRecentFiles, t])

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) {
      return
    }
    void onLoadFile(file, null)
  }

  const onOpenRecentFile = useCallback(
    async (entry: RecentFileRecord): Promise<boolean> => {
      if (!onDiscardUnsavedChanges()) {
        return false
      }
      try {
        const importedDocument = parseJbb(entry.content)
        setDocument(importedDocument)
        setOpenFileHandle(null)
        setOpenFileName(entry.name)
        await saveRecentFile(entry.name, entry.content)
        await refreshRecentFiles()
        return true
      } catch (error) {
        await deleteRecentFile(entry.id)
        await refreshRecentFiles()
        window.alert(t('error.openRecentFile', { error: getErrorMessage(error, t('error.unexpected')) }))
        return false
      }
    },
    [onDiscardUnsavedChanges, refreshRecentFiles, setDocument, t],
  )

  const onDeleteRecentEntry = useCallback(
    async (entryId: string) => {
      await deleteRecentFile(entryId)
      await refreshRecentFiles()
    },
    [refreshRecentFiles],
  )

  return {
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
    onOpenRecentFile,
    onDeleteRecentEntry,
  }
}
