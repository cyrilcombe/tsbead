import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from './domain/defaults'
import { useEditorStore } from './domain/editorStore'
import { I18nProvider } from './i18n/I18nProvider'
import App from './App'

vi.mock('./storage/db', () => ({
  deleteRecentFile: vi.fn(async () => {}),
  listRecentFiles: vi.fn(async () => []),
  loadAppSettings: vi.fn(async () => ({
    defaultAuthor: '',
    defaultOrganization: '',
    symbols: DEFAULT_BEAD_SYMBOLS,
    printPageSize: 'a4',
    printOrientation: 'portrait',
    language: 'en',
  })),
  loadProject: vi.fn(async () => undefined),
  saveAppSettings: vi.fn(async () => {}),
  saveProject: vi.fn(async () => {}),
  saveRecentFile: vi.fn(async () => {}),
}))

vi.mock('./ui/canvas/BeadCanvas', () => ({
  BeadCanvas: () => <div data-testid="bead-canvas" />,
}))

vi.mock('./ui/canvas/BeadPreviewCanvas', () => ({
  BeadPreviewCanvas: () => <div data-testid="bead-preview-canvas" />,
}))

function setMatchMedia(mode: 'desktop' | 'compact' | 'single'): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        (mode === 'compact' || mode === 'single') &&
        (
          query === '(max-width: 1024px)'
        ) ||
        (mode === 'single' && query === '(max-width: 500px)'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  )
}

describe('App smoke', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
    useEditorStore.getState().setDocument(createEmptyDocument())
    setMatchMedia('desktop')
  })

  it('renders and opens help dialog', async () => {
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Help...' }))
    expect(await screen.findByRole('heading', { name: 'Help' })).toBeTruthy()
  })

  it('keeps a single visible pane on initial mobile portrait render', async () => {
    setMatchMedia('single')
    render(
      <I18nProvider>
        <App />
      </I18nProvider>,
    )

    await waitFor(() => {
      const view = useEditorStore.getState().document.view
      const visibleCount =
        Number(view.draftVisible) +
        Number(view.correctedVisible) +
        Number(view.simulationVisible) +
        Number(view.reportVisible)
      expect(visibleCount).toBe(1)
    })
  })
})
