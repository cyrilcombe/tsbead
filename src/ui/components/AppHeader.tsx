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
import { useI18n } from '../../i18n/I18nProvider'
import { usePlatformShortcuts } from '../hooks/usePlatformShortcuts'

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
  mobilePaneVisibilityById: Record<ViewPaneId, boolean>
  panes: ViewPaneEntry[]
  mobileActionsMenuRef: RefObject<HTMLDivElement | null>
  openFileInputRef: RefObject<HTMLInputElement | null>
  onToggleMobileActionsMenu: () => void
  onCloseMobileActionsMenu: () => void
  onToggleMobileView: (pane: ViewPaneId) => void
  onNewDocument: () => void
  onOpenDocument: () => Promise<void>
  onOpenRecentDialog: () => void
  onSaveDocument: () => Promise<boolean>
  onSaveAsDocument: () => Promise<boolean>
  onDownloadFile: (name: string) => void
  onPrintDocument: () => void
  onOpenPreferencesDialog: () => void
  onOpenHelpDialog: () => void
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
  mobilePaneVisibilityById,
  panes,
  mobileActionsMenuRef,
  openFileInputRef,
  onToggleMobileActionsMenu,
  onCloseMobileActionsMenu,
  onToggleMobileView,
  onNewDocument,
  onOpenDocument,
  onOpenRecentDialog,
  onSaveDocument,
  onSaveAsDocument,
  onDownloadFile,
  onPrintDocument,
  onOpenPreferencesDialog,
  onOpenHelpDialog,
  onOpenMetadataDialog,
  onFileInputChange,
}: AppHeaderProps) {
  const { t } = useI18n()
  const shortcuts = usePlatformShortcuts()

  return (
    <>
      <header className="app-header">
        <div className="mobile-header-left" ref={mobileActionsMenuRef}>
          <button className="action icon-action mobile-menu-toggle" aria-label={t('actionsMenu.open')} aria-expanded={isMobileActionsMenuOpen} onClick={onToggleMobileActionsMenu}>
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
                title={shortcuts.newDocument}
              >
                <FilePlus2 className="header-action-icon" aria-hidden="true" />
                <span>{t('action.new')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onOpenDocument()
                }}
                title={shortcuts.openDocument}
              >
                <FolderOpen className="header-action-icon" aria-hidden="true" />
                <span>{t('action.open')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenRecentDialog()
                }}
                disabled={recentFilesCount === 0}
                title={shortcuts.openRecent}
              >
                <FolderClock className="header-action-icon" aria-hidden="true" />
                <span>{t('action.openRecent')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onSaveDocument()
                }}
                title={shortcuts.save}
              >
                <Save className="header-action-icon" aria-hidden="true" />
                <span>{t('action.save')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  void onSaveAsDocument()
                }}
                title={shortcuts.saveAs}
              >
                <SaveAll className="header-action-icon" aria-hidden="true" />
                <span>{t('action.saveAs')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onDownloadFile(openFileName)
                }}
              >
                <Download className="header-action-icon" aria-hidden="true" />
                <span>{t('action.exportJbb')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onPrintDocument()
                }}
                disabled={!hasAnyPaneVisible}
                title={shortcuts.print}
              >
                <Printer className="header-action-icon" aria-hidden="true" />
                <span>{t('action.print')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenPreferencesDialog()
                }}
                title={shortcuts.preferences}
              >
                <Settings2 className="header-action-icon" aria-hidden="true" />
                <span>{t('action.preferences')}</span>
              </button>
              <button
                className="action header-action"
                onClick={() => {
                  onCloseMobileActionsMenu()
                  onOpenHelpDialog()
                }}
              >
                <Info className="header-action-icon" aria-hidden="true" />
                <span>{t('action.help')}</span>
              </button>
              <div className="mobile-actions-file">
                <strong>{openFileName}</strong>
                {dirty ? <span className="file-status-dirty">{t('status.unsaved')}</span> : null}
                <button
                  className="metadata-inline-action"
                  onClick={() => {
                    onCloseMobileActionsMenu()
                    onOpenMetadataDialog()
                  }}
                  title={t('metadata.edit')}
                >
                  {metadataLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="header-main">
          <img className="app-logo" src={logoSrc} alt={t('app.logoAlt')} />
        </div>
        <p className="mobile-file-status">
          <strong>{openFileName}</strong>
          {dirty ? <span className="file-status-dirty">{t('status.unsaved')}</span> : null}
        </p>
        <div className="header-controls">
          <div className="header-actions">
            <button className="action header-action" onClick={onNewDocument} title={shortcuts.newDocument}>
              <FilePlus2 className="header-action-icon" aria-hidden="true" />
              <span>{t('action.new')}</span>
            </button>
            <button className="action header-action" onClick={() => void onOpenDocument()} title={shortcuts.openDocument}>
              <FolderOpen className="header-action-icon" aria-hidden="true" />
              <span>{t('action.open')}</span>
            </button>
            <button className="action header-action" onClick={onOpenRecentDialog} disabled={recentFilesCount === 0} title={shortcuts.openRecent}>
              <FolderClock className="header-action-icon" aria-hidden="true" />
              <span>{t('action.openRecent')}</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveDocument()} title={shortcuts.save}>
              <Save className="header-action-icon" aria-hidden="true" />
              <span>{t('action.save')}</span>
            </button>
            <button className="action header-action" onClick={() => void onSaveAsDocument()} title={shortcuts.saveAs}>
              <SaveAll className="header-action-icon" aria-hidden="true" />
              <span>{t('action.saveAs')}</span>
            </button>
            <button className="action header-action" onClick={() => onDownloadFile(openFileName)}>
              <Download className="header-action-icon" aria-hidden="true" />
              <span>{t('action.exportJbb')}</span>
            </button>
            <button className="action header-action" onClick={onPrintDocument} disabled={!hasAnyPaneVisible} title={shortcuts.print}>
              <Printer className="header-action-icon" aria-hidden="true" />
              <span>{t('action.print')}</span>
            </button>
            <button className="action header-action" onClick={onOpenPreferencesDialog} title={shortcuts.preferences}>
              <Settings2 className="header-action-icon" aria-hidden="true" />
              <span>{t('action.preferences')}</span>
            </button>
            <button className="action header-action" onClick={onOpenHelpDialog}>
              <Info className="header-action-icon" aria-hidden="true" />
              <span>{t('action.help')}</span>
            </button>
          </div>
          <p className="file-status">
            <strong>{openFileName}</strong>
            {dirty ? <span className="file-status-dirty">{t('status.unsaved')}</span> : null}
            <button className="metadata-inline-action" onClick={onOpenMetadataDialog} title={t('metadata.edit')}>
              {metadataLabel}
            </button>
          </p>
        </div>
        <input ref={openFileInputRef} className="hidden-file-input" type="file" accept=".jbb,text/plain" onChange={onFileInputChange} />
      </header>

      <section className="mobile-view-tabs" aria-label={t('view.tabsAria')}>
        {panes.map((pane) => (
          <button
            key={`mobile-tab-${pane.id}`}
            className={`action mobile-view-tab ${mobilePaneVisibilityById[pane.id] ? 'active' : ''}`}
            aria-pressed={mobilePaneVisibilityById[pane.id]}
            onClick={() => onToggleMobileView(pane.id)}
          >
            {pane.label}
          </button>
        ))}
      </section>
    </>
  )
}
