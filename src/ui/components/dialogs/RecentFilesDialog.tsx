import type { RecentFileRecord } from '../../../storage/db'
import { useI18n } from '../../../i18n/I18nProvider'

interface RecentFilesDialogProps {
  isOpen: boolean
  recentFiles: RecentFileRecord[]
  formatTimestamp: (value: number) => string
  onOpenRecentFile: (entry: RecentFileRecord) => Promise<void>
  onDeleteRecentEntry: (entryId: string) => Promise<void>
  onClose: () => void
}

export function RecentFilesDialog({
  isOpen,
  recentFiles,
  formatTimestamp,
  onOpenRecentFile,
  onDeleteRecentEntry,
  onClose,
}: RecentFilesDialogProps) {
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog recent-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.recent.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.recent.title')}</h2>
          <span>{t('dialog.recent.files', { count: recentFiles.length })}</span>
        </div>
        {recentFiles.length === 0 ? (
          <p className="recent-empty">{t('dialog.recent.empty')}</p>
        ) : (
          <div className="recent-list">
            {recentFiles.map((entry) => (
              <div key={entry.id} className="recent-item">
                <button className="action recent-open" onClick={() => void onOpenRecentFile(entry)}>
                  <span className="recent-name">{entry.name}</span>
                  <span className="recent-date">{formatTimestamp(entry.updatedAt)}</span>
                </button>
                <button className="action recent-remove" onClick={() => void onDeleteRecentEntry(entry.id)}>
                  {t('dialog.remove')}
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </section>
    </div>
  )
}
