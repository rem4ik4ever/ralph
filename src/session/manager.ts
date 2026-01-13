import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { nanoid } from 'nanoid'

export interface SessionMeta {
  id: string
  task: string
  agent: string
  cwd: string
  iterations: number
  startTime: string
  contextFiles?: string[]
}

export function getRalphDir(): string {
  return join(homedir(), '.ralph')
}

export function getSessionsDir(): string {
  return join(getRalphDir(), 'sessions')
}

export function getSessionDir(sessionId: string): string {
  return join(getSessionsDir(), sessionId)
}

export interface CreateSessionOpts {
  task: string
  agent: string
  iterations: number
  contextFiles?: string[]
}

export async function createSession(opts: CreateSessionOpts): Promise<string> {
  const sessionId = nanoid(10)
  const sessionDir = getSessionDir(sessionId)

  await mkdir(sessionDir, { recursive: true })

  const meta: SessionMeta = {
    id: sessionId,
    task: opts.task,
    agent: opts.agent,
    cwd: process.cwd(),
    iterations: opts.iterations,
    startTime: new Date().toISOString(),
    contextFiles: opts.contextFiles,
  }

  await writeFile(join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2))

  return sessionId
}
