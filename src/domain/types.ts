export type ToolId = 'pencil' | 'line' | 'fill' | 'select'

export type RgbaColor = [number, number, number, number?]

export interface CellPoint {
  x: number
  y: number
}

export interface SelectionRect {
  start: CellPoint
  end: CellPoint
}

export interface JBeadView {
  draftVisible: boolean
  correctedVisible: boolean
  simulationVisible: boolean
  reportVisible: boolean
  selectedTool: ToolId
  selectedColor: number
  zoom: number
  scroll: number
  shift: number
}

export interface JBeadModel {
  rows: number[][]
}

export interface JBeadDocument {
  version: number
  author: string
  organization: string
  notes: string
  colors: RgbaColor[]
  view: JBeadView
  model: JBeadModel
}
