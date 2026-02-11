import type { RecentFileRecord } from '../../../storage/db'

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
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog recent-dialog panel" role="dialog" aria-modal="true" aria-label="Open recent">
        <div className="panel-title">
          <h2>Open Recent</h2>
          <span>{recentFiles.length} files</span>
        </div>
        {recentFiles.length === 0 ? (
          <p className="recent-empty">No recent files yet.</p>
        ) : (
          <div className="recent-list">
            {recentFiles.map((entry) => (
              <div key={entry.id} className="recent-item">
                <button className="action recent-open" onClick={() => void onOpenRecentFile(entry)}>
                  <span className="recent-name">{entry.name}</span>
                  <span className="recent-date">{formatTimestamp(entry.updatedAt)}</span>
                </button>
                <button className="action recent-remove" onClick={() => void onDeleteRecentEntry(entry.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  )
}
