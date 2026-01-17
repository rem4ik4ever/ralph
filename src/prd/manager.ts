import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PrdJson, PrdStatus, PrdStatusType } from './types.js'

export function getPrdsDir(): string {
  return join(homedir(), '.ralph', 'prd')
}

export function getPrdDir(name: string): string {
  return join(getPrdsDir(), name)
}

export async function prdExists(name: string): Promise<boolean> {
  try {
    await access(getPrdDir(name))
    return true
  } catch {
    return false
  }
}

export async function createPrdFolder(name: string): Promise<void> {
  await mkdir(getPrdDir(name), { recursive: true })
}

export async function copyMarkdown(src: string, name: string): Promise<void> {
  const dest = join(getPrdDir(name), 'prd.md')
  await copyFile(src, dest)
}

export async function getPrd(name: string): Promise<PrdJson> {
  const prdPath = join(getPrdDir(name), 'prd.json')
  const content = await readFile(prdPath, 'utf-8')
  return JSON.parse(content) as PrdJson
}

function computeStatus(prd: PrdJson): PrdStatusType {
  const completed = prd.tasks.filter((t) => t.passes).length
  if (completed === 0) return 'pending'
  if (completed === prd.tasks.length) return 'completed'
  return 'in_progress'
}

export async function listPrds(): Promise<PrdStatus[]> {
  const prdsDir = getPrdsDir()
  let entries: string[]

  try {
    entries = await readdir(prdsDir)
  } catch {
    return []
  }

  const results: PrdStatus[] = []

  for (const entry of entries) {
    try {
      const prd = await getPrd(entry)
      const status = computeStatus(prd)
      const tasksCompleted = prd.tasks.filter((t) => t.passes).length

      results.push({
        name: prd.prdName,
        description: prd.tasks[0]?.description ?? '',
        status,
        tasksTotal: prd.tasks.length,
        tasksCompleted,
      })
    } catch {
      // Skip invalid PRD folders
    }
  }

  return results
}
