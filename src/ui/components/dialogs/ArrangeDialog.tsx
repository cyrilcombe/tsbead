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
  if (!isOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <section className="arrange-dialog panel" role="dialog" aria-modal="true" aria-label="Arrange selection">
        <div className="panel-title">
          <h2>Arrange Selection</h2>
        </div>
        <div className="arrange-form">
          <label className="arrange-field">
            Horizontal offset
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
            Vertical offset
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
            Copies
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
