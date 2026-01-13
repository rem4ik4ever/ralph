import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentResult } from '../agents/base.js'
import { getSessionDir } from './manager.js'

export interface LogEntry {
  iteration: number
  timestamp: string
  duration: number
  exitCode: number
  output: string
}

export async function writeLog(
  sessionId: string,
  iteration: number,
  result: AgentResult
): Promise<void> {
  const sessionDir = getSessionDir(sessionId)
  const logPath = join(sessionDir, `${iteration}.log`)

  const header = [
    `# Iteration ${iteration}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Duration: ${result.duration}ms`,
    `Exit Code: ${result.exitCode}`,
    '---',
    '',
  ].join('\n')

  await writeFile(logPath, header + result.output)
}
