import { useI18n } from '../../../i18n/I18nProvider'

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
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.metadata.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.metadata.title')}</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            {t('dialog.metadata.author')}
            <input className="arrange-input" type="text" value={author} onChange={(event) => onAuthorChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            {t('dialog.metadata.organization')}
            <input className="arrange-input" type="text" value={organization} onChange={(event) => onOrganizationChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            {t('dialog.metadata.notes')}
            <textarea className="arrange-input metadata-notes-input" value={notes} onChange={(event) => onNotesChange(event.currentTarget.value)} />
          </label>
        </div>
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button className="action tool-action active" onClick={onApply}>
            {t('dialog.apply')}
          </button>
        </div>
      </section>
    </div>
  )
}
