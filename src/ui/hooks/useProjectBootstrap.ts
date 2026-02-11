import { useEffect, useState } from 'react'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from '../../domain/defaults'
import type { JBeadDocument } from '../../domain/types'
import { loadAppSettings, loadProject, saveProject, type AppSettings } from '../../storage/db'

const LOCAL_PROJECT_ID = 'local-default'
const LOCAL_PROJECT_NAME = 'Local Draft'

const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultAuthor: '',
  defaultOrganization: '',
  symbols: DEFAULT_BEAD_SYMBOLS,
  printPageSize: 'a4',
  printOrientation: 'portrait',
}

interface UseProjectBootstrapOptions {
  document: JBeadDocument
  setDocument: (document: JBeadDocument) => void
}

export function useProjectBootstrap({ document, setDocument }: UseProjectBootstrapOptions) {
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)

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

  return {
    appSettings,
    setAppSettings,
  }
}
