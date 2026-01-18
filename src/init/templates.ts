import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class BundledTemplateNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Bundled template not found: ${path}. This is a packaging error.`)
    this.name = 'BundledTemplateNotFoundError'
  }
}

export function getClaudeDir(): string {
  return join(homedir(), '.claude')
}

export function getTargetSkillDir(): string {
  return join(getClaudeDir(), 'skills', 'ralph-prd')
}

export function getTargetSkillPath(): string {
  return join(getTargetSkillDir(), 'SKILL.md')
}

export function getTargetCommandPath(): string {
  return join(getClaudeDir(), 'commands', 'ralph-complete-next-task.md')
}

export function getBundledSkillPath(): string {
  return join(__dirname, '../../templates/ralph-prd-skill.md')
}

export function getBundledCommandPath(): string {
  return join(__dirname, '../../templates/ralph-complete-next-task-command.md')
}

export async function loadBundledSkill(): Promise<string> {
  const path = getBundledSkillPath()
  try {
    return await readFile(path, 'utf-8')
  } catch {
    throw new BundledTemplateNotFoundError(path)
  }
}

export async function loadBundledCommand(): Promise<string> {
  const path = getBundledCommandPath()
  try {
    return await readFile(path, 'utf-8')
  } catch {
    throw new BundledTemplateNotFoundError(path)
  }
}
