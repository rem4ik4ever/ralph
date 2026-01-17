import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  getClaudeDir,
  getSourceSkillPath,
  getSourceCommandPath,
  getTargetSkillDir,
  getTargetSkillPath,
  getTargetCommandPath,
  readSourceSkill,
  readSourceCommand,
  transformSkillContent,
  transformCommandContent,
  SourceFileNotFoundError,
} from '../../init/templates.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

describe('init/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('path helpers', () => {
    it('getClaudeDir returns ~/.claude', () => {
      expect(getClaudeDir()).toBe('/home/test/.claude')
    })

    it('getSourceSkillPath returns ~/.claude/skills/prd/SKILL.md', () => {
      expect(getSourceSkillPath()).toBe('/home/test/.claude/skills/prd/SKILL.md')
    })

    it('getSourceCommandPath returns ~/.claude/commands/complete-next-task.md', () => {
      expect(getSourceCommandPath()).toBe('/home/test/.claude/commands/complete-next-task.md')
    })

    it('getTargetSkillDir returns ~/.claude/skills/ralph-prd', () => {
      expect(getTargetSkillDir()).toBe('/home/test/.claude/skills/ralph-prd')
    })

    it('getTargetSkillPath returns ~/.claude/skills/ralph-prd/SKILL.md', () => {
      expect(getTargetSkillPath()).toBe('/home/test/.claude/skills/ralph-prd/SKILL.md')
    })

    it('getTargetCommandPath returns ~/.claude/commands/ralph-complete-next-task.md', () => {
      expect(getTargetCommandPath()).toBe('/home/test/.claude/commands/ralph-complete-next-task.md')
    })
  })

  describe('readSourceSkill', () => {
    it('reads skill file', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('skill content')

      const content = await readSourceSkill()

      expect(content).toBe('skill content')
      expect(readFile).toHaveBeenCalledWith('/home/test/.claude/skills/prd/SKILL.md', 'utf-8')
    })

    it('throws SourceFileNotFoundError when file missing', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'))

      await expect(readSourceSkill()).rejects.toThrow(SourceFileNotFoundError)
    })
  })

  describe('readSourceCommand', () => {
    it('reads command file', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('command content')

      const content = await readSourceCommand()

      expect(content).toBe('command content')
      expect(readFile).toHaveBeenCalledWith('/home/test/.claude/commands/complete-next-task.md', 'utf-8')
    })

    it('throws SourceFileNotFoundError when file missing', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'))

      await expect(readSourceCommand()).rejects.toThrow(SourceFileNotFoundError)
    })
  })

  describe('transformSkillContent', () => {
    it('changes name from prd to ralph-prd', () => {
      const input = '---\nname: prd\ndescription: desc'
      const output = transformSkillContent(input)
      expect(output).toContain('name: ralph-prd')
    })

    it('transforms prd-<feature-name>.md to .ralph/prd/<feature-name>/prd.md', () => {
      const input = 'Save to `prd-<feature-name>.md`'
      const output = transformSkillContent(input)
      expect(output).toContain('.ralph/prd/<feature-name>/prd.md')
    })

    it('transforms prd-<name>.md references', () => {
      const input = 'Output `prd-<name>.md`'
      const output = transformSkillContent(input)
      expect(output).toContain('.ralph/prd/<name>/prd.md')
    })
  })

  describe('transformCommandContent', () => {
    it('changes /complete-next-task to /ralph-complete-next-task', () => {
      const input = 'Usage: /complete-next-task <prd>'
      const output = transformCommandContent(input)
      expect(output).toContain('/ralph-complete-next-task')
    })

    it('transforms .claude/state/ to .ralph/prd/', () => {
      const input = 'Path: .claude/state/<prd>/prd.json'
      const output = transformCommandContent(input)
      expect(output).toContain('.ralph/prd/')
    })

    it('transforms find_claude_state to find_ralph_state', () => {
      const input = 'find_claude_state() {'
      const output = transformCommandContent(input)
      expect(output).toContain('find_ralph_state')
    })
  })
})
