import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

export class SourceFileNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Source file not found: ${path}`)
    this.name = 'SourceFileNotFoundError'
  }
}

export function getClaudeDir(): string {
  return join(homedir(), '.claude')
}

export function getSourceSkillPath(): string {
  return join(getClaudeDir(), 'skills', 'prd', 'SKILL.md')
}

export function getSourceCommandPath(): string {
  return join(getClaudeDir(), 'commands', 'complete-next-task.md')
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

export async function readSourceSkill(): Promise<string> {
  const path = getSourceSkillPath()
  try {
    return await readFile(path, 'utf-8')
  } catch {
    throw new SourceFileNotFoundError(path)
  }
}

export async function readSourceCommand(): Promise<string> {
  const path = getSourceCommandPath()
  try {
    return await readFile(path, 'utf-8')
  } catch {
    throw new SourceFileNotFoundError(path)
  }
}

export function transformSkillContent(content: string): string {
  // Transform skill to output PRDs to .ralph/prd/ instead of project root
  let transformed = content

  // Update skill name and description
  transformed = transformed.replace(
    /^---\nname: prd\n/m,
    '---\nname: ralph-prd\n'
  )

  // Update output path: prd-<feature-name>.md -> .ralph/prd/<name>/prd.md
  transformed = transformed.replace(
    /`prd-<feature-name>\.md`/g,
    '`.ralph/prd/<feature-name>/prd.md`'
  )

  transformed = transformed.replace(
    /`prd-<name>\.md`/g,
    '`.ralph/prd/<name>/prd.md`'
  )

  // Update "Generate markdown PRD to..." instructions
  transformed = transformed.replace(
    /Generate markdown PRD to `prd-<feature-name>\.md` in project root/g,
    'Generate markdown PRD to `.ralph/prd/<feature-name>/prd.md`'
  )

  // Update "Save to" instructions
  transformed = transformed.replace(
    /Save to `prd-<feature-name>\.md` \(project root\):/g,
    'Save to `.ralph/prd/<feature-name>/prd.md`:'
  )

  // Update post-creation message
  transformed = transformed.replace(
    /PRD saved to prd-<name>\.md/g,
    'PRD saved to .ralph/prd/<name>/prd.md'
  )

  return transformed
}

export function transformCommandContent(content: string): string {
  // Transform command to read from .ralph/ instead of .claude/state/
  let transformed = content

  // Update command name in usage
  transformed = transformed.replace(
    /\/complete-next-task/g,
    '/ralph-complete-next-task'
  )

  // Update state directory references
  transformed = transformed.replace(
    /\.claude\/state\//g,
    '.ralph/prd/'
  )

  transformed = transformed.replace(
    /\.claude\/state/g,
    '.ralph/prd'
  )

  // Update the bash find function
  transformed = transformed.replace(
    /find_claude_state/g,
    'find_ralph_state'
  )

  // Update <state-dir> references
  transformed = transformed.replace(
    /<state-dir>/g,
    '<ralph-dir>'
  )

  return transformed
}
