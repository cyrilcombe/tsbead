import { useI18n } from '../../../i18n/I18nProvider'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const { t } = useI18n()

  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog help-dialog panel" role="dialog" aria-modal="true" aria-label={t('dialog.help.aria')}>
        <div className="panel-title">
          <h2>{t('dialog.help.title')}</h2>
        </div>
        <div className="help-content">
          <section className="help-section">
            <h3>{t('help.introduction.title')}</h3>
            <p>{t('help.introduction.text')}</p>
            <p>{t('help.introduction.format')}</p>
          </section>

          <section className="help-section">
            <h3>{t('help.shortcuts.title')}</h3>
            <div className="help-shortcuts-table-wrap">
              <table className="help-shortcuts-table">
                <thead>
                  <tr>
                    <th>{t('help.shortcuts.action')}</th>
                    <th>{t('help.shortcuts.mac')}</th>
                    <th>{t('help.shortcuts.winlinux')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t('help.shortcuts.new')}</td>
                    <td>Cmd+N</td>
                    <td>Ctrl+N</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.open')}</td>
                    <td>Cmd+O</td>
                    <td>Ctrl+O</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.openRecent')}</td>
                    <td>Cmd+Shift+O</td>
                    <td>Ctrl+Shift+O</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.saveSaveAs')}</td>
                    <td>Cmd+S / Cmd+Shift+S</td>
                    <td>Ctrl+S / Ctrl+Shift+S</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.undoRedo')}</td>
                    <td>Cmd+Z / Cmd+Shift+Z</td>
                    <td>Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z)</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.print')}</td>
                    <td>Cmd+P</td>
                    <td>Ctrl+P</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.preferences')}</td>
                    <td>Cmd+, (or Cmd+Shift+P)</td>
                    <td>Ctrl+, (or Ctrl+Shift+P)</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.tools')}</td>
                    <td>Cmd+1..6</td>
                    <td>Ctrl+1..6</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.arrange')}</td>
                    <td>F8</td>
                    <td>F8</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.zoom')}</td>
                    <td>Cmd+I / Cmd+U</td>
                    <td>Ctrl+I / Ctrl+U</td>
                  </tr>
                  <tr>
                    <td>{t('help.shortcuts.shift')}</td>
                    <td>ArrowLeft / ArrowRight</td>
                    <td>ArrowLeft / ArrowRight</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="help-section">
            <h3>{t('help.gestures.title')}</h3>
            <ul>
              <li>{t('help.gestures.pinch')}</li>
              <li>{t('help.gestures.swipe')}</li>
              <li>{t('help.gestures.editing')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.pwa.title')}</h3>
            <ul>
              <li>{t('help.pwa.desktop')}</li>
              <li>{t('help.pwa.android')}</li>
              <li>{t('help.pwa.ios')}</li>
              <li>{t('help.pwa.update')}</li>
              <li>{t('help.pwa.reopen')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.credits.title')}</h3>
            <ul>
              <li>{t('help.credits.originalAuthor')}</li>
              <li>
                {t('help.credits.website')}{' '}
                <a href="https://www.jbead.ch/" target="_blank" rel="noreferrer">
                  https://www.jbead.ch/
                </a>
              </li>
              <li>
                {t('help.credits.github')}{' '}
                <a href="https://github.com/damianbrunold/jbead" target="_blank" rel="noreferrer">
                  https://github.com/damianbrunold/jbead
                </a>
              </li>
              <li>{t('help.credits.port')}</li>
              <li>{t('help.credits.tsbeadAuthor')}</li>
              <li>
                {t('help.credits.website')}{' '}
                <a href="https://cyrilcombe.github.io/tsbead/" target="_blank" rel="noreferrer">
                  https://cyrilcombe.github.io/tsbead/
                </a>
              </li>
              <li>
                {t('help.credits.github')}{' '}
                <a href="https://github.com/cyrilcombe/tsbead" target="_blank" rel="noreferrer">
                  https://github.com/cyrilcombe/tsbead
                </a>
              </li>
            </ul>
          </section>
        </div>
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </section>
    </div>
  )
}
