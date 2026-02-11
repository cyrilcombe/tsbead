import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyDocument, DEFAULT_BEAD_SYMBOLS } from './domain/defaults'
import { useEditorStore } from './domain/editorStore'
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

function setMatchMedia(isCompactTabsMode: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        isCompactTabsMode &&
        (
          query === '(max-width: 1200px)' ||
          query === '(max-width: 980px)' ||
          query === '(max-width: 980px) and (orientation: portrait)'
        ),
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
    setMatchMedia(false)
  })

  it('renders and opens help dialog', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Help...' }))
    expect(await screen.findByRole('heading', { name: 'Help' })).toBeTruthy()
  })

  it('keeps a single visible pane on initial mobile portrait render', async () => {
    setMatchMedia(true)
    render(<App />)

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
