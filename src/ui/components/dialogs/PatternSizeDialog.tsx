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
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Pattern size">
        <div className="panel-title">
          <h2>Pattern Size</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            Width (beads)
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
            Height (rows)
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
