import type { ChangeEvent, RefObject } from 'react'
import {
  Download,
  FilePlus2,
  FolderClock,
  FolderOpen,
  Info,
  Menu,
  Printer,
  Save,
  SaveAll,
  Settings2,
} from 'lucide-react'
import type { ViewPaneId } from '../../domain/types'

interface ViewPaneEntry {
  id: ViewPaneId
  label: string
}

interface AppHeaderProps {
  logoSrc: string
  openFileName: string
  dirty: boolean
  metadataLabel: string
  hasAnyPaneVisible: boolean
  recentFilesCount: number
  isMobileActionsMenuOpen: boolean
  mobileActivePane: ViewPaneId
  panes: ViewPaneEntry[]
  mobileActionsMenuRef: RefObject<HTMLDivElement | null>
  openFileInputRef: RefObject<HTMLInputElement | null>
  onToggleMobileActionsMenu: () => void
  onCloseMobileActionsMenu: () => void
  onSelectMobileView: (pane: ViewPaneId) => void
  onNewDocument: () => void
  onOpenDocument: () => Promise<void>
  onOpenRecentDialog: () => void
  onSaveDocument: () => Promise<boolean>
  onSaveAsDocument: () => Promise<boolean>
  onDownloadFile: (name: string) => void
  onPrintDocument: () => void
  onOpenPreferencesDialog: () => void
  onOpenCreditsDialog: () => void
  onOpenMetadataDialog: () => void
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function AppHeader({
  logoSrc,
  openFileName,
  dirty,
  metadataLabel,
  hasAnyPaneVisible,
  recentFilesCount,
  isMobileActionsMenuOpen,
  mobileActivePane,
  panes,
  mobileActionsMenuRef,
  openFileInputRef,
  onToggleMobileActionsMenu,
  onCloseMobileActionsMenu,
  onSelectMobileView,
  onNewDocument,
  onOpenDocument,
  onOpenRecentDialog,
  onSaveDocument,
  onSaveAsDocument,
  onDownloadFile,
  onPrintDocument,
  onOpenPreferencesDialog,
  onOpenCreditsDialog,
  onOpenMetadataDialog,
  onFileInputChange,
}: AppHeaderProps) {
  return (
    <>
      <header className="app-header">
        <div className="mobile-header-left" ref={mobileActionsMenuRef}>
          <button className="action icon-action mobile-menu-toggle" aria-label="Open actions menu" aria-expanded={isMobileActionsMenuOpen} onClick={onToggleMobileActionsMenu}>
            <Menu className="tool-icon" aria-hidden="true" />
          </button>
          {isMobileActionsMenuOpen ? (
            <div className="mobile-actions-menu">
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onNewDocument()
                }}
              >
                <FilePlus2 className="header-action-icon" aria-hidden="true" />
                <span>New</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onOpenDocument()
                }}
              >
                <FolderOpen className="header-action-icon" aria-hidden="true" />
                <span>Open...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenRecentDialog()
                }}
                disabled={recentFilesCount === 0}
              >
                <FolderClock className="header-action-icon" aria-hidden="true" />
                <span>Open recent...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onSaveDocument()
                }}
              >
                <Save className="header-action-icon" aria-hidden="true" />
                <span>Save</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onSaveAsDocument()
                }}
              >
                <SaveAll className="header-action-icon" aria-hidden="true" />
                <span>Save As...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onDownloadFile(openFileName)
                }}
              >
                <Download className="header-action-icon" aria-hidden="true" />
                <span>Export .jbb</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onPrintDocument()
                }}
                disabled={!hasAnyPaneVisible}
              >
                <Printer className="header-action-icon" aria-hidden="true" />
                <span>Print...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenPreferencesDialog()
                }}
              >
                <Settings2 className="header-action-icon" aria-hidden="true" />
                <span>Preferences...</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenCreditsDialog()
                }}
              >
                <Info className="header-action-icon" aria-hidden="true" />
                <span>Credits...</span>
              </button>
              <div className="mobile-actions-file">
                <strong>{openFileName}</strong>
                {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
                <button
                  className="metadata-inline-action"
                  onClick={() => {
                    onCloseMobileActionsMenu()
                    onOpenMetadataDialog()
                  }}
                  title="Edit metadata"
                >
                  {metadataLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="header-main">
          <img className="app-logo" src={logoSrc} alt="TsBead" />
        </div>
        <p className="mobile-file-status">
          <strong>{openFileName}</strong>
          {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
        </p>
        <div className="header-controls">
          <div className="header-actions">
            <button className="action header-action" onClick={onNewDocument}>
              <FilePlus2 className="header-action-icon" aria-hidden="true" />
              <span>New</span>
            </button>
            <button className="action header-action" onClick={() => void onOpenDocument()}>
              <FolderOpen className="header-action-icon" aria-hidden="true" />
              <span>Open...</span>
            </button>
            <button className="action header-action" onClick={onOpenRecentDialog} disabled={recentFilesCount === 0}>
              <FolderClock className="header-action-icon" aria-hidden="true" />
              <span>Open recent...</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveDocument()}>
              <Save className="header-action-icon" aria-hidden="true" />
              <span>Save</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveAsDocument()}>
              <SaveAll className="header-action-icon" aria-hidden="true" />
              <span>Save As...</span>
            </button>
            <button className="action header-action" onClick={() => onDownloadFile(openFileName)}>
              <Download className="header-action-icon" aria-hidden="true" />
              <span>Export .jbb</span>
            </button>
            <button className="action header-action" onClick={onPrintDocument} disabled={!hasAnyPaneVisible}>
              <Printer className="header-action-icon" aria-hidden="true" />
              <span>Print...</span>
            </button>
            <button className="action header-action" onClick={onOpenPreferencesDialog}>
              <Settings2 className="header-action-icon" aria-hidden="true" />
              <span>Preferences...</span>
            </button>
            <button className="action header-action" onClick={onOpenCreditsDialog}>
              <Info className="header-action-icon" aria-hidden="true" />
              <span>Credits...</span>
            </button>
          </div>
          <p className="file-status">
            <strong>{openFileName}</strong>
            {dirty ? <span className="file-status-dirty"> (unsaved)</span> : null}
            <button className="metadata-inline-action" onClick={onOpenMetadataDialog} title="Edit metadata">
              {metadataLabel}
            </button>
          </p>
        </div>
        <input ref={openFileInputRef} className="hidden-file-input" type="file" accept=".jbb,text/plain" onChange={onFileInputChange} />
      </header>

      <section className="mobile-view-tabs" aria-label="View tabs">
        {panes.map((pane) => (
          <button key={`mobile-tab-${pane.id}`} className={`action mobile-view-tab ${mobileActivePane === pane.id ? 'active' : ''}`} onClick={() => onSelectMobileView(pane.id)}>
            {pane.label}
          </button>
        ))}
      </section>
    </>
  )
}
