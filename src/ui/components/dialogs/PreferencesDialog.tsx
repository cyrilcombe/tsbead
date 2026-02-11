import type { AppSettings } from '../../../storage/db'

interface PreferencesDialogProps {
  isOpen: boolean
  defaultAuthor: string
  defaultOrganization: string
  symbols: string
  pageSize: AppSettings['printPageSize']
  orientation: AppSettings['printOrientation']
  onDefaultAuthorChange: (value: string) => void
  onDefaultOrganizationChange: (value: string) => void
  onSymbolsChange: (value: string) => void
  onPageSizeChange: (value: AppSettings['printPageSize']) => void
  onOrientationChange: (value: AppSettings['printOrientation']) => void
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
  onDefaultAuthorChange,
  onDefaultOrganizationChange,
  onSymbolsChange,
  onPageSizeChange,
  onOrientationChange,
  onApply,
  onClose,
}: PreferencesDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Preferences">
        <div className="panel-title">
          <h2>Preferences</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            Default author
            <input className="arrange-input" type="text" value={defaultAuthor} onChange={(event) => onDefaultAuthorChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            Default organization
            <input className="arrange-input" type="text" value={defaultOrganization} onChange={(event) => onDefaultOrganizationChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            Symbols
            <input className="arrange-input" type="text" value={symbols} onChange={(event) => onSymbolsChange(event.currentTarget.value)} />
          </label>
          <label className="arrange-field">
            Paper
            <select className="arrange-input" value={pageSize} onChange={(event) => onPageSizeChange(event.currentTarget.value as AppSettings['printPageSize'])}>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </label>
          <label className="arrange-field">
            Orientation
            <select className="arrange-input" value={orientation} onChange={(event) => onOrientationChange(event.currentTarget.value as AppSettings['printOrientation'])}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
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
