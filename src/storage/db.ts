import Dexie, { type Table } from 'dexie'
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

class JBeadDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>
  recentFiles!: Table<RecentFileRecord, string>

  constructor() {
    super('jbead-web')
    this.version(1).stores({
      projects: 'id, updatedAt',
    })
    this.version(2).stores({
      projects: 'id, updatedAt',
      recentFiles: 'id, updatedAt',
    })
  }
}

export const db = new JBeadDatabase()

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
