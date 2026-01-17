import { readFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getTemplatesDir(): string {
  return join(homedir(), '.ralph', 'templates')
}

export function getBundledTemplatesDir(): string {
  return join(__dirname, '..', '..', 'templates')
}

export async function ensureTemplates(): Promise<void> {
  const userDir = getTemplatesDir()
  const bundledDir = getBundledTemplatesDir()

  await mkdir(userDir, { recursive: true })

  let files: string[]
  try {
    files = await readdir(bundledDir)
  } catch {
    return
  }

  for (const file of files) {
    if (file.endsWith('.md')) {
      const src = join(bundledDir, file)
      const dest = join(userDir, file)
      try {
        await copyFile(src, dest)
      } catch {
        // ignore copy errors
      }
    }
  }
}

export async function loadTemplate(name: string): Promise<string> {
  const templatePath = join(getTemplatesDir(), `${name}.md`)
  return readFile(templatePath, 'utf-8')
}

export function substituteVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`$${key}`, value)
  }
  return result
}
