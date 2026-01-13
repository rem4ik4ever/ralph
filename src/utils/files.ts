import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function readContextFiles(paths: string[]): Promise<string> {
  const contents: string[] = []

  for (const filePath of paths) {
    const absolutePath = resolve(process.cwd(), filePath)
    const content = await readFile(absolutePath, 'utf-8')
    contents.push(`# File: ${filePath}\n${content}`)
  }

  return contents.join('\n\n')
}

export async function buildPrompt(
  task: string,
  contextFiles?: string[]
): Promise<string> {
  if (!contextFiles || contextFiles.length === 0) {
    return task
  }

  const contextContent = await readContextFiles(contextFiles)
  return `${task}\n\n---\n\n${contextContent}`
}
