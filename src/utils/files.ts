import { readFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'

export const COMPLETION_MARKER = '<ralph>RALPH_COMPLETED</ralph>'

const COMPLETION_INSTRUCTIONS = `
---
When you have fully completed the task with no remaining work, include this marker in your final response:
${COMPLETION_MARKER}

Only use this marker when the task is 100% complete.
`

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function readPromptFiles(inputs: string[]): Promise<string> {
  const contents: string[] = []

  for (const input of inputs) {
    const absolutePath = resolve(process.cwd(), input)

    if (await fileExists(absolutePath)) {
      const content = await readFile(absolutePath, 'utf-8')
      contents.push(content)
    } else {
      // treat as direct text
      contents.push(input)
    }
  }

  return contents.join('\n\n')
}

export async function buildPrompt(inputs: string[]): Promise<string> {
  const content = await readPromptFiles(inputs)
  return content + COMPLETION_INSTRUCTIONS
}
