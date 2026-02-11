interface CreditsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreditsDialog({ isOpen, onClose }: CreditsDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog credits-dialog panel" role="dialog" aria-modal="true" aria-label="Credits">
        <div className="panel-title">
          <h2>Credits</h2>
        </div>
        <div className="credits-content">
          <p>TsBead is a TypeScript port of the excellent original work done by Damian Brunold on JBead.</p>
          <ul>
            <li>Original author: Damian Brunold</li>
            <li>
              Website:{' '}
              <a href="https://www.jbead.ch/" target="_blank" rel="noreferrer">
                https://www.jbead.ch/
              </a>
            </li>
            <li>
              GitHub:{' '}
              <a href="https://github.com/damianbrunold/jbead" target="_blank" rel="noreferrer">
                https://github.com/damianbrunold/jbead
              </a>
            </li>
          </ul>
          <p>
            File format support in TsBead: <strong>.jbb only</strong>. The legacy <strong>.dbb</strong> format is not supported.
          </p>
        </div>
        <div className="arrange-actions">
          <button className="action" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  )
}
