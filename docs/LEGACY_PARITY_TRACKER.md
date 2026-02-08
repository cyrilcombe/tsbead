# Legacy Parity Tracker (Java -> Web)

Last updated: 2026-02-08 (late night, S-006)

## Purpose
Track feature parity between legacy Java JBead (`/Users/cyrilcombe/Dev/perso/jbead`) and web app (`/Users/cyrilcombe/Dev/perso/jbead-web`), with an actionable task breakdown.

Status legend:
- `DONE`: implemented in web app
- `PARTIAL`: partially implemented
- `TODO`: not implemented yet
- `N/A`: intentionally not planned (desktop-only feature)

## Exhaustive Feature Inventory

| ID | Area | Legacy Feature | Java Reference | Web Status |
|---|---|---|---|---|
| F-001 | Layout | 4 main panes: Draft / Corrected / Simulation / Report | `src/ch/jbead/JBeadFrame.java` `createMainGUI()` | `PARTIAL` (all 4 panes present; report block layout still not pixel-parity) |
| F-002 | Layout | Per-pane visibility toggles | `ViewDraftAction`, `ViewCorrectedAction`, `ViewSimulationAction`, `ViewReportAction` | `DONE` |
| F-003 | Layout | Vertical scroll tied to row index | `JBeadFrame.java` + `Model.setScroll()` | `DONE` |
| F-004 | Views | Draft rendering with row markers | `view/DraftPanel.java` | `DONE` |
| F-005 | Views | Corrected rendering (offset rows / corrected index mapping) | `view/CorrectedPanel.java`, `Model.correct()` | `DONE` |
| F-006 | Views | Simulation rendering (wrapped/shifted woven preview) | `view/SimulationPanel.java` | `DONE` |
| F-007 | Views | Report rendering (infos + color counts + bead run list) | `view/ReportPanel.java` | `DONE` |
| F-008 | Tools | Pencil: click toggles point, drag draws snapped line | `ToolPencilAction`, `DraftPanel.handleMouse*` | `PARTIAL` |
| F-009 | Tools | Select: rectangular selection | `ToolSelectAction`, `Selection.java` | `PARTIAL` |
| F-010 | Tools | Fill (linear fill along flattened pattern) | `ToolFillAction`, `Model.fillLine()` | `DONE` |
| F-011 | Tools | Pipette (pick color from bead) | `ToolPipetteAction`, `DraftPanel.selectColorFrom()` | `DONE` |
| F-012 | Edit | Delete selection content | `EditDeleteAction`, `Model.delete()` | `DONE` |
| F-013 | Edit | Mirror horizontal | `EditMirrorHorizontalAction`, `Model.mirrorHorizontal()` | `DONE` |
| F-014 | Edit | Mirror vertical | `EditMirrorVerticalAction`, `Model.mirrorVertical()` | `DONE` |
| F-015 | Edit | Rotate square selection | `EditRotateAction`, `Model.rotate()` | `DONE` |
| F-016 | Edit | Arrange selection copies with offset | `EditArrangeAction`, `ArrangeDialog`, `Model.arrangeSelection()` | `DONE` |
| F-017 | Edit | Insert row | `EditInsertRowAction`, `Model.insertRow()` | `DONE` |
| F-018 | Edit | Delete row | `EditDeleteRowAction`, `Model.deleteRow()` | `DONE` |
| F-019 | History | Undo | `EditUndoAction`, `Model.undo()`, `BeadUndo.java` | `DONE` |
| F-020 | History | Redo | `EditRedoAction`, `Model.redo()`, `BeadUndo.java` | `DONE` |
| F-021 | View Options | Draw colors toggle | `ViewDrawColorsAction`, `View.drawColors()` | `TODO` |
| F-022 | View Options | Draw symbols toggle | `ViewDrawSymbolsAction`, `View.drawSymbols()` | `TODO` |
| F-023 | View Options | Zoom in/normal/out | `ViewZoomInAction`, `ViewZoomNormalAction`, `ViewZoomOutAction` | `PARTIAL` (zoom value exists, no controls) |
| F-024 | Pattern | Pattern width dialog and resize | `PatternWidthAction`, `PatternWidthDialog`, `Model.setWidth()` | `DONE` |
| F-025 | Pattern | Pattern height dialog and resize | `PatternHeightAction`, `PatternHeightDialog`, `Model.setHeight()` | `DONE` |
| F-026 | Pattern | Preferences (author, organization, symbols, update-check setting) | `PatternPreferencesAction`, `PreferencesDialog` | `TODO` |
| F-027 | Model | Shift left/right (pattern phase shift) | `JBeadFrame.rotateLeft/Right`, `Model.shiftLeft/Right()` | `DONE` |
| F-028 | Model | Repeat detection (`beads per repeat`, rows per repeat) | `Model.updateRepeat()`, `Model.calcRepeat()` | `PARTIAL` (implemented for report summary calculations) |
| F-029 | Palette | 32-color palette with selected color indicator | `ui/ColorPalette.java` | `PARTIAL` (palette exists; not full legacy behavior) |
| F-030 | Palette | Double-click/popup color edit | `ColorPalette.chooseColor()` | `TODO` |
| F-031 | Palette | Set clicked color as background (swap with color 0) | `ColorPalette.asBackground()` | `TODO` |
| F-032 | Input | Numeric shortcuts 0-9 for color selection | `JBeadFrame.formKeyUp()` | `DONE` |
| F-033 | Input | Keyboard shortcuts and accelerators from actions | action classes `putValue(ACCELERATOR_KEY, ...)` | `PARTIAL` (tool accelerators Ctrl/Cmd+1..4 implemented) |
| F-034 | Input | Space/Escape/arrow interactions for tools/shift | `JBeadFrame.formKeyDown/formKeyUp()` | `PARTIAL` (left/right shift implemented; space/escape still pending) |
| F-035 | File IO | Open `.jbb` | `JBeadFileFormat`, `JBeadMemento` | `DONE` |
| F-036 | File IO | Save/export `.jbb` | `JBeadFileFormat`, `JBeadMemento` | `DONE` |
| F-037 | File IO | Open/save `.dbb` legacy format | `DbbFileFormat`, `DbbMemento` | `TODO` |
| F-038 | File IO | New/Open/Save/Save As flows | `FileNewAction`, `FileOpenAction`, `FileSaveAction`, `FileSaveAsAction` | `PARTIAL` |
| F-039 | File IO | MRU recent files list | `FileMRUAction`, `JBeadFrame.addToMRU()` | `TODO` |
| F-040 | Metadata | Author / organization / notes persisted in file | `Model.saveTo/loadFrom`, `Memento` | `PARTIAL` |
| F-041 | Report | Pattern info block (circumference/repeat/rows/beads) | `ReportInfos.java` | `DONE` |
| F-042 | Report | Color usage counts | `BeadCounts.java` | `DONE` |
| F-043 | Report | Bead run list (sequence counts) | `BeadList.java`, `BeadRun.java` | `DONE` |
| F-044 | Print | Print visible sections (draft/corrected/simulation/report) | `print/DesignPrinter.java` | `TODO` |
| F-045 | Print | Page setup persistence (paper/orientation) | `FilePageSetupAction`, `PrintSettings` | `TODO` |
| F-046 | Info | Technical info dialog | `InfoTechInfosAction`, `dialog/TechInfosDialog` | `N/A` |
| F-047 | Info | Update check | `InfoUpdateCheckAction` | `N/A` |
| F-048 | Info | About dialog | `InfoAboutAction` | `N/A` |

## Task Breakdown (Execution Plan)

### Phase 1 - Multi-view parity foundation
- [x] T-001 Add workspace layout with Draft, Corrected, Simulation, Report panes
- [x] T-002 Implement shared vertical row scroll model across panes
- [x] T-003 Implement Corrected renderer (`Model.correct` equivalent)
- [x] T-004 Implement Simulation renderer (shift + weave mapping)
- [x] T-005 Add view visibility toggles for all panes

### Phase 2 - Editing parity
- [x] T-006 Add pipette tool in Draft pane
- [x] T-007 Enable edit interactions from Corrected and Simulation panes
- [x] T-008 Add insert row / delete row actions
- [x] T-009 Add arrange selection dialog + operation
- [x] T-010 Add keyboard shortcuts (0-9 colors, arrows for shift, tool shortcuts)

### Phase 3 - Pattern controls and history
- [x] T-011 Add undo/redo history stack equivalent to `BeadUndo`
- [x] T-012 Add width/height pattern dialogs and model resizing
- [x] T-013 Add shift controls (left/right buttons + key repeat)
- [ ] T-014 Implement repeat detection and expose in UI
- [ ] T-015 Add view options: zoom in/normal/out, draw colors/symbols toggles

### Phase 4 - Palette/report completeness
- [ ] T-016 Add full 32-color palette behavior (edit color + set as background)
- [x] T-017 Build report infos panel (pattern, repeat, row/bead totals)
- [x] T-018 Build color usage block and bead run list
- [ ] T-019 Add metadata editors (author, organization, notes)

### Phase 5 - File/compat/print
- [ ] T-020 Add file flows: New/Open/Save/Save As equivalents
- [ ] T-021 Add MRU list (local storage based)
- [ ] T-022 Decide `.dbb` support strategy and implement or explicitly drop
- [ ] T-023 Add print/export strategy for web (PDF or print stylesheet)

## Next Recommended Slice

Target a thin vertical slice first:
- [x] S-001 Implement Corrected and Simulation panes read-only
- [x] S-002 Add view toggles for Draft/Corrected/Simulation/Report
- [x] S-003 Add report infos block (without color lists yet)
- [x] S-004 Add bead-run list section in report
- [x] S-005 Align vertical scrollbar behavior to legacy row-index model

This slice unlocks visual parity early and reduces risk before implementing advanced editing/history.
