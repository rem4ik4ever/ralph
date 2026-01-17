import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PrdJson, PrdStatus, PrdStatusType } from './types.js'

export function getLocalPrdsDir(): string {
  return join(process.cwd(), '.ralph', 'prd')
}

export function getGlobalPrdsDir(): string {
  return join(homedir(), '.ralph', 'prd')
}

export function getPrdsDir(): string {
  return getGlobalPrdsDir()
}

export function getLocalPrdDir(name: string): string {
  return join(getLocalPrdsDir(), name)
}

export function getGlobalPrdDir(name: string): string {
  return join(getGlobalPrdsDir(), name)
}

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function getPrdDir(name: string): Promise<string> {
  const localDir = getLocalPrdDir(name)
  if (await dirExists(localDir)) {
    return localDir
  }
  return getGlobalPrdDir(name)
}

export async function prdExists(name: string): Promise<boolean> {
  const localDir = getLocalPrdDir(name)
  const globalDir = getGlobalPrdDir(name)
  return (await dirExists(localDir)) || (await dirExists(globalDir))
}

export async function createPrdFolder(name: string): Promise<void> {
  const prdDir = await getPrdDir(name)
  await mkdir(prdDir, { recursive: true })
}

export async function copyMarkdown(src: string, name: string): Promise<void> {
  const prdDir = await getPrdDir(name)
  const dest = join(prdDir, 'prd.md')
  await copyFile(src, dest)
}

export async function getPrd(name: string): Promise<PrdJson> {
  const prdDir = await getPrdDir(name)
  const prdPath = join(prdDir, 'prd.json')
  const content = await readFile(prdPath, 'utf-8')
  return JSON.parse(content) as PrdJson
}

function computeStatus(prd: PrdJson): PrdStatusType {
  const completed = prd.tasks.filter((t) => t.passes).length
  if (completed === 0) return 'pending'
  if (completed === prd.tasks.length) return 'completed'
  return 'in_progress'
}

async function readPrdEntries(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

export async function listPrds(): Promise<PrdStatus[]> {
  const localEntries = await readPrdEntries(getLocalPrdsDir())
  const globalEntries = await readPrdEntries(getGlobalPrdsDir())

  // Dedupe: local takes precedence
  const allEntries = [...new Set([...localEntries, ...globalEntries])]
  const results: PrdStatus[] = []

  for (const entry of allEntries) {
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
