import Dexie, { type Table } from 'dexie'
import { DEFAULT_BEAD_SYMBOLS } from '../domain/defaults'
import type { JBeadDocument } from '../domain/types'

export interface ProjectRecord {
  id: string
  name: string
  updatedAt: number
  document: JBeadDocument
}

export interface RecentFileRecord {
  id: string
  name: string
  updatedAt: number
  content: string
}

const MAX_RECENT_FILES = 12
const APP_SETTINGS_ID = 'app-settings'

export interface AppSettings {
  defaultAuthor: string
  defaultOrganization: string
  symbols: string
  printPageSize: 'a4' | 'letter'
  printOrientation: 'portrait' | 'landscape'
}

interface AppSettingsRecord extends AppSettings {
  id: string
}

class TsBeadDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>
  recentFiles!: Table<RecentFileRecord, string>
  appSettings!: Table<AppSettingsRecord, string>

  constructor() {
    super('tsbead')
    this.version(1).stores({
      projects: 'id, updatedAt',
    })
    this.version(2).stores({
      projects: 'id, updatedAt',
      recentFiles: 'id, updatedAt',
    })
    this.version(3).stores({
      projects: 'id, updatedAt',
      recentFiles: 'id, updatedAt',
      appSettings: 'id',
    })
  }
}

export const db = new TsBeadDatabase()

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  return db.projects.get(id)
}

export async function saveProject(record: ProjectRecord): Promise<void> {
  await db.projects.put(record)
}

function normalizeRecentName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return 'design.jbb'
  }
  return trimmed.toLowerCase().endsWith('.jbb') ? trimmed : `${trimmed}.jbb`
}

function toRecentId(name: string): string {
  return normalizeRecentName(name).toLowerCase()
}

export async function saveRecentFile(name: string, content: string): Promise<void> {
  const normalizedName = normalizeRecentName(name)
  await db.recentFiles.put({
    id: toRecentId(normalizedName),
    name: normalizedName,
    updatedAt: Date.now(),
    content,
  })

  const total = await db.recentFiles.count()
  if (total <= MAX_RECENT_FILES) {
    return
  }

  const staleEntries = await db.recentFiles.orderBy('updatedAt').limit(total - MAX_RECENT_FILES).toArray()
  if (staleEntries.length > 0) {
    await db.recentFiles.bulkDelete(staleEntries.map((entry) => entry.id))
  }
}

export async function listRecentFiles(limit = MAX_RECENT_FILES): Promise<RecentFileRecord[]> {
  return db.recentFiles.orderBy('updatedAt').reverse().limit(limit).toArray()
}

export async function deleteRecentFile(id: string): Promise<void> {
  await db.recentFiles.delete(id)
}

export async function loadAppSettings(): Promise<AppSettings> {
  const record = await db.appSettings.get(APP_SETTINGS_ID)
  const printPageSize = record?.printPageSize === 'letter' ? 'letter' : 'a4'
  const printOrientation = record?.printOrientation === 'landscape' ? 'landscape' : 'portrait'
  return {
    defaultAuthor: record?.defaultAuthor ?? '',
    defaultOrganization: record?.defaultOrganization ?? '',
    symbols: record?.symbols && record.symbols.length > 0 ? record.symbols : DEFAULT_BEAD_SYMBOLS,
    printPageSize,
    printOrientation,
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const normalizedSymbols = settings.symbols.length > 0 ? settings.symbols : DEFAULT_BEAD_SYMBOLS
  await db.appSettings.put({
    id: APP_SETTINGS_ID,
    defaultAuthor: settings.defaultAuthor,
    defaultOrganization: settings.defaultOrganization,
    symbols: normalizedSymbols,
    printPageSize: settings.printPageSize === 'letter' ? 'letter' : 'a4',
    printOrientation: settings.printOrientation === 'landscape' ? 'landscape' : 'portrait',
  })
}
