import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { nanoid } from 'nanoid'

export interface SessionMeta {
  id: string
  promptFiles: string[]
  agent: string
  cwd: string
  iterations: number
  startTime: string
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
  promptFiles: string[]
  agent: string
  iterations: number
}

export async function createSession(opts: CreateSessionOpts): Promise<string> {
  const sessionId = nanoid(10)
  const sessionDir = getSessionDir(sessionId)

  await mkdir(sessionDir, { recursive: true })

  const meta: SessionMeta = {
    id: sessionId,
    promptFiles: opts.promptFiles,
    agent: opts.agent,
    cwd: process.cwd(),
    iterations: opts.iterations,
    startTime: new Date().toISOString(),
  }

  await writeFile(join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2))

  return sessionId
}
