import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type {
  PrdDirMode,
  PrdJson,
  PrdLocation,
  PrdStatus,
  PrdStatusType,
} from './types.js'

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

export async function isProjectInitialized(): Promise<boolean> {
  const localRalphDir = join(process.cwd(), '.ralph')
  return dirExists(localRalphDir)
}

export async function getPrdDir(
  name: string,
  mode: PrdDirMode = 'read',
): Promise<string> {
  const localDir = getLocalPrdDir(name)
  const globalDir = getGlobalPrdDir(name)

  if (mode === 'write') {
    // Write mode: use local if project is initialized, else global
    if (await isProjectInitialized()) {
      return localDir
    }
    return globalDir
  }

  // Read mode: local if exists, else global (current behavior)
  if (await dirExists(localDir)) {
    return localDir
  }
  return globalDir
}

export async function prdExists(
  name: string,
  location?: 'local' | 'global',
): Promise<boolean> {
  const localDir = getLocalPrdDir(name)
  const globalDir = getGlobalPrdDir(name)

  if (location === 'local') {
    return dirExists(localDir)
  }
  if (location === 'global') {
    return dirExists(globalDir)
  }
  // Check both when location not specified
  return (await dirExists(localDir)) || (await dirExists(globalDir))
}

export async function createPrdFolder(
  name: string,
  location: PrdLocation = 'auto',
): Promise<void> {
  let prdDir: string

  if (location === 'local') {
    prdDir = getLocalPrdDir(name)
  } else if (location === 'global') {
    prdDir = getGlobalPrdDir(name)
  } else {
    // auto: use write mode to get local-first behavior
    prdDir = await getPrdDir(name, 'write')
  }

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

  let content: string
  try {
    content = await readFile(prdPath, 'utf-8')
  } catch (err) {
    if (err instanceof Error && 'code' in err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'EACCES') {
        throw new Error(`Permission denied: ${prdPath}`)
      }
      if (code === 'ENOENT') {
        throw new Error(`PRD not found: ${name}`)
      }
    }
    throw err
  }

  try {
    return JSON.parse(content) as PrdJson
  } catch {
    throw new Error(`Invalid JSON in PRD file: ${prdPath}`)
  }
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

async function getPrdFromDir(
  dir: string,
  entry: string,
): Promise<PrdJson | null> {
  try {
    const prdPath = join(dir, entry, 'prd.json')
    const content = await readFile(prdPath, 'utf-8')
    return JSON.parse(content) as PrdJson
  } catch {
    return null
  }
}

export async function listPrds(): Promise<PrdStatus[]> {
  const localDir = getLocalPrdsDir()
  const globalDir = getGlobalPrdsDir()
  const localEntries = await readPrdEntries(localDir)
  const globalEntries = await readPrdEntries(globalDir)

  const results: PrdStatus[] = []
  const seenNames = new Set<string>()

  // Process local entries first (they take precedence)
  for (const entry of localEntries) {
    const prd = await getPrdFromDir(localDir, entry)
    if (!prd) continue

    const status = computeStatus(prd)
    const tasksCompleted = prd.tasks.filter((t) => t.passes).length
    seenNames.add(entry)

    results.push({
      name: prd.prdName,
      description: prd.tasks[0]?.description ?? '',
      status,
      tasksTotal: prd.tasks.length,
      tasksCompleted,
      location: 'local',
    })
  }

  // Process global entries, skip if shadowed by local
  for (const entry of globalEntries) {
    if (seenNames.has(entry)) continue

    const prd = await getPrdFromDir(globalDir, entry)
    if (!prd) continue

    const status = computeStatus(prd)
    const tasksCompleted = prd.tasks.filter((t) => t.passes).length

    results.push({
      name: prd.prdName,
      description: prd.tasks[0]?.description ?? '',
      status,
      tasksTotal: prd.tasks.length,
      tasksCompleted,
      location: 'global',
    })
  }

  return results
}
