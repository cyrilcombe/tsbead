import type { AppSettings } from '../../../storage/db'
import type { AppLocale } from '../../../i18n/translations'
import { useI18n } from '../../../i18n/I18nProvider'

interface PreferencesDialogProps {
  isOpen: boolean
  defaultAuthor: string
  defaultOrganization: string
  symbols: string
  pageSize: AppSettings['printPageSize']
  orientation: AppSettings['printOrientation']
  language: AppLocale
  onDefaultAuthorChange: (value: string) => void
  onDefaultOrganizationChange: (value: string) => void
  onSymbolsChange: (value: string) => void
  onPageSizeChange: (value: AppSettings['printPageSize']) => void
  onOrientationChange: (value: AppSettings['printOrientation']) => void
  onLanguageChange: (value: AppLocale) => void
  onApply: () => void
  onClose: () => void
}

export function PreferencesDialog({
  isOpen,
  defaultAuthor,
  defaultOrganization,
  symbols,
  pageSize,
  orientation,
  language,
  onDefaultAuthorChange,
  onDefaultOrganizationChange,
  onSymbolsChange,
  onPageSizeChange,
  onOrientationChange,
  onLanguageChange,
  onApply,
  onClose,
}: PreferencesDialogProps) {
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.preferences.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.preferences.title')}</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            {t('dialog.preferences.defaultAuthor')}
            <input className="arrange-input" type="text" value={defaultAuthor} onChange={(event) => onDefaultAuthorChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            {t('dialog.preferences.defaultOrganization')}
            <input className="arrange-input" type="text" value={defaultOrganization} onChange={(event) => onDefaultOrganizationChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            {t('dialog.preferences.symbols')}
            <input className="arrange-input" type="text" value={symbols} onChange={(event) => onSymbolsChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            {t('dialog.preferences.paper')}
            <select className="arrange-input" value={pageSize} onChange={(event) => onPageSizeChange(event.currentTarget.value as AppSettings['printPageSize'])}>
              <option value="a4">{t('dialog.preferences.paper.a4')}</option>
              <option value="letter">{t('dialog.preferences.paper.letter')}</option>
            </select>
          </label>
          <label className="arrange-field">
            {t('dialog.preferences.orientation')}
            <select className="arrange-input" value={orientation} onChange={(event) => onOrientationChange(event.currentTarget.value as AppSettings['printOrientation'])}>
              <option value="portrait">{t('dialog.preferences.orientation.portrait')}</option>
              <option value="landscape">{t('dialog.preferences.orientation.landscape')}</option>
            </select>
          </label>
          <label className="arrange-field">
            {t('dialog.preferences.language')}
            <select className="arrange-input" value={language} onChange={(event) => onLanguageChange(event.currentTarget.value as AppLocale)}>
              <option value="en">{t('language.en')}</option>
              <option value="fr">{t('language.fr')}</option>
              <option value="de">{t('language.de')}</option>
              <option value="es">{t('language.es')}</option>
              <option value="it">{t('language.it')}</option>
              <option value="nl">{t('language.nl')}</option>
            </select>
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
