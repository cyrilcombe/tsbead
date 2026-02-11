interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog help-dialog panel" role="dialog" aria-modal="true" aria-label="Help">
        <div className="panel-title">
          <h2>Help</h2>
        </div>
        <div className="help-content">
          <section className="help-section">
            <h3>Introduction</h3>
            <p>
              The TsBead software is a bead rope crochet design tool originally created by Damian Brunold. It can be
              freely downloaded and used. It is open source sofware, licensed under the GPLv3 license.
            </p>
            <p>
              File format support in TsBead: <strong>.jbb only</strong>. The legacy <strong>.dbb</strong> format is not
              supported.
            </p>
          </section>

          <section className="help-section">
            <h3>Keyboard Shortcuts</h3>
            <div className="help-shortcuts-table-wrap">
              <table className="help-shortcuts-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Mac</th>
                    <th>Windows / Linux</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>New</td>
                    <td>Cmd+N</td>
                    <td>Ctrl+N</td>
                  </tr>
                  <tr>
                    <td>Open</td>
                    <td>Cmd+O</td>
                    <td>Ctrl+O</td>
                  </tr>
                  <tr>
                    <td>Open recent</td>
                    <td>Cmd+Shift+O</td>
                    <td>Ctrl+Shift+O</td>
                  </tr>
                  <tr>
                    <td>Save / Save As</td>
                    <td>Cmd+S / Cmd+Shift+S</td>
                    <td>Ctrl+S / Ctrl+Shift+S</td>
                  </tr>
                  <tr>
                    <td>Undo / Redo</td>
                    <td>Cmd+Z / Cmd+Shift+Z</td>
                    <td>Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z)</td>
                  </tr>
                  <tr>
                    <td>Print</td>
                    <td>Cmd+P</td>
                    <td>Ctrl+P</td>
                  </tr>
                  <tr>
                    <td>Preferences</td>
                    <td>Cmd+, (or Cmd+Shift+P)</td>
                    <td>Ctrl+, (or Ctrl+Shift+P)</td>
                  </tr>
                  <tr>
                    <td>Tools</td>
                    <td>Cmd+1..6</td>
                    <td>Ctrl+1..6</td>
                  </tr>
                  <tr>
                    <td>Arrange selection</td>
                    <td>F8</td>
                    <td>F8</td>
                  </tr>
                  <tr>
                    <td>Zoom in / out</td>
                    <td>Cmd+I / Cmd+U</td>
                    <td>Ctrl+I / Ctrl+U</td>
                  </tr>
                  <tr>
                    <td>Shift pattern left / right</td>
                    <td>ArrowLeft / ArrowRight</td>
                    <td>ArrowLeft / ArrowRight</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="help-section">
            <h3>PWA Installation &amp; Updates</h3>
            <ul>
              <li>Desktop (Chrome/Edge): open TsBead in the browser, then use Install App from the address bar menu.</li>
              <li>Android (Chrome): open TsBead, then tap Add to Home screen / Install app.</li>
              <li>iPhone/iPad (Safari): open TsBead, tap Share, then Add to Home Screen.</li>
              <li>To update: open the app while online and refresh once; the new version is applied after reload.</li>
              <li>If needed, close and reopen the installed app after an update deployment.</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Credits</h3>
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
              <li>TsBead is a TypeScript port of JBead.</li>
              <li>Author: Cyril Combe</li>
              <li>
                Website:{' '}
                <a href="https://cyrilcombe.github.io/tsbead/" target="_blank" rel="noreferrer">
                  https://cyrilcombe.github.io/tsbead/
                </a>
              </li>
              <li>
                GitHub:{' '}
                <a href="https://github.com/cyrilcombe/tsbead" target="_blank" rel="noreferrer">
                  https://github.com/cyrilcombe/tsbead
                </a>
              </li>
            </ul>
          </section>
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
