import { useI18n } from '../../../i18n/I18nProvider'

interface PatternSizeDialogProps {
  isOpen: boolean
  widthInput: string
  heightInput: string
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  onWidthChange: (value: string) => void
  onHeightChange: (value: string) => void
  onApply: () => void
  onClose: () => void
}

export function PatternSizeDialog({
  isOpen,
  widthInput,
  heightInput,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  onWidthChange,
  onHeightChange,
  onApply,
  onClose,
}: PatternSizeDialogProps) {
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.patternSize.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.patternSize.title')}</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            {t('dialog.patternSize.width')}
            <input
              className="arrange-input"
              type="number"
              min={minWidth}
              max={maxWidth}
              step={1}
              value={widthInput}
              onChange={(event) => onWidthChange(event.currentTarget.value)}
            />
          </label>
          <label className="arrange-field">
            {t('dialog.patternSize.height')}
            <input
              className="arrange-input"
              type="number"
              min={minHeight}
              max={maxHeight}
              step={1}
              value={heightInput}
              onChange={(event) => onHeightChange(event.currentTarget.value)}
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
