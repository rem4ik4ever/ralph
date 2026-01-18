import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFile, readFile as fsReadFile } from 'node:fs/promises'
import {
  getClaudeDir,
  getTargetSkillDir,
  getTargetSkillPath,
  getTargetCommandPath,
  getBundledSkillPath,
  getBundledCommandPath,
  loadBundledSkill,
  loadBundledCommand,
  BundledTemplateNotFoundError,
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

    it('getTargetSkillDir returns ~/.claude/skills/ralph-prd', () => {
      expect(getTargetSkillDir()).toBe('/home/test/.claude/skills/ralph-prd')
    })

    it('getTargetSkillPath returns ~/.claude/skills/ralph-prd/SKILL.md', () => {
      expect(getTargetSkillPath()).toBe('/home/test/.claude/skills/ralph-prd/SKILL.md')
    })

    it('getTargetCommandPath returns ~/.claude/commands/ralph-complete-next-task.md', () => {
      expect(getTargetCommandPath()).toBe('/home/test/.claude/commands/ralph-complete-next-task.md')
    })

    it('getBundledSkillPath returns path to bundled skill template', () => {
      expect(getBundledSkillPath()).toContain('templates/ralph-prd-skill.md')
    })

    it('getBundledCommandPath returns path to bundled command template', () => {
      expect(getBundledCommandPath()).toContain('templates/ralph-complete-next-task-command.md')
    })
  })

  describe('loadBundledSkill', () => {
    it('reads bundled skill file', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('skill content')

      const content = await loadBundledSkill()

      expect(content).toBe('skill content')
      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('ralph-prd-skill.md'), 'utf-8')
    })

    it('throws BundledTemplateNotFoundError when file missing', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'))

      await expect(loadBundledSkill()).rejects.toThrow(BundledTemplateNotFoundError)
    })
  })

  describe('loadBundledCommand', () => {
    it('reads bundled command file', async () => {
      vi.mocked(readFile).mockResolvedValueOnce('command content')

      const content = await loadBundledCommand()

      expect(content).toBe('command content')
      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('ralph-complete-next-task-command.md'), 'utf-8')
    })

    it('throws BundledTemplateNotFoundError when file missing', async () => {
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'))

      await expect(loadBundledCommand()).rejects.toThrow(BundledTemplateNotFoundError)
    })
  })

  describe('bundled skill content', () => {
    it('contains post-creation registration instruction', async () => {
      const { readFile: realReadFile } = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
      const skillPath = getBundledSkillPath()
      const content = await realReadFile(skillPath, 'utf-8')

      expect(content).toContain('ralph prd add')
      expect(content).toContain('Register the PRD')
    })

    it('contains post-creation execution prompt', async () => {
      const { readFile: realReadFile } = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
      const skillPath = getBundledSkillPath()
      const content = await realReadFile(skillPath, 'utf-8')

      expect(content).toContain('Ask About Execution')
      expect(content).toContain('/ralph-complete-next-task')
    })
  })
})
