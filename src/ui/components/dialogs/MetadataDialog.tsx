interface MetadataDialogProps {
  isOpen: boolean
  author: string
  organization: string
  notes: string
  onAuthorChange: (value: string) => void
  onOrganizationChange: (value: string) => void
  onNotesChange: (value: string) => void
  onApply: () => void
  onClose: () => void
}

export function MetadataDialog({
  isOpen,
  author,
  organization,
  notes,
  onAuthorChange,
  onOrganizationChange,
  onNotesChange,
  onApply,
  onClose,
}: MetadataDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Metadata">
        <div className="panel-title">
          <h2>Metadata</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            Author
            <input className="arrange-input" type="text" value={author} onChange={(event) => onAuthorChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            Organization
            <input className="arrange-input" type="text" value={organization} onChange={(event) => onOrganizationChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            Notes
            <textarea className="arrange-input metadata-notes-input" value={notes} onChange={(event) => onNotesChange(event.currentTarget.value)} />
          </label>
        </div>
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            Cancel
          </button>
          <button className="action tool-action active" onClick={onApply}>
            Apply
          </button>
        </div>
      </section>
    </div>
  )
}
