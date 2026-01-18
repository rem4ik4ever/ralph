import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  return await readFile(path, 'utf-8')
}

export async function loadBundledCommand(): Promise<string> {
  const path = getBundledCommandPath()
  return await readFile(path, 'utf-8')
}
