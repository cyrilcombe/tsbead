import { useI18n } from '../../../i18n/I18nProvider'

interface ArrangeDialogProps {
  isOpen: boolean
  horizontalOffset: string
  verticalOffset: string
  copies: string
  onHorizontalOffsetChange: (value: string) => void
  onVerticalOffsetChange: (value: string) => void
  onCopiesChange: (value: string) => void
  onApply: () => void
  onClose: () => void
}

export function ArrangeDialog({
  isOpen,
  horizontalOffset,
  verticalOffset,
  copies,
  onHorizontalOffsetChange,
  onVerticalOffsetChange,
  onCopiesChange,
  onApply,
  onClose,
}: ArrangeDialogProps) {
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.arrange.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.arrange.title')}</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            {t('dialog.arrange.horizontalOffset')}
            <input
              className="arrange-input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={horizontalOffset}
              onChange={(event) => onHorizontalOffsetChange(event.currentTarget.value)}
            />
          </label>
          <label className="arrange-field">
            {t('dialog.arrange.verticalOffset')}
            <input
              className="arrange-input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={verticalOffset}
              onChange={(event) => onVerticalOffsetChange(event.currentTarget.value)}
            />
          </label>
          <label className="arrange-field">
            {t('dialog.arrange.copies')}
            <input
              className="arrange-input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={copies}
              onChange={(event) => onCopiesChange(event.currentTarget.value)}
            />
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
