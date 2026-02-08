import Dexie, { type Table } from 'dexie'
import type { JBeadDocument } from '../domain/types'

export interface ProjectRecord {
  id: string
  name: string
  updatedAt: number
  document: JBeadDocument
}

class JBeadDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>

  constructor() {
    super('jbead-web')
    this.version(1).stores({
      projects: 'id, updatedAt',
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
