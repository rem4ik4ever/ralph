import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  getTemplatesDir,
  ensureTemplates,
  loadTemplate,
  substituteVars,
} from '../../templates/templates.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  mkdir: vi.fn(),
  copyFile: vi.fn(),
  readdir: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

describe('templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplatesDir', () => {
    it('returns ~/.ralph/templates path', () => {
      const result = getTemplatesDir()
      expect(result).toBe('/home/test/.ralph/templates')
    })
  })

  describe('ensureTemplates', () => {
    it('creates templates directory', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(readdir).mockResolvedValue([])

      await ensureTemplates()

      expect(mkdir).toHaveBeenCalledWith(
        '/home/test/.ralph/templates',
        { recursive: true }
      )
    })

    it('copies bundled .md files to user templates', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(readdir).mockResolvedValue([
        'template1.md',
        'template2.md',
        'readme.txt',
      ] as unknown as import('node:fs').Dirent[])
      vi.mocked(copyFile).mockResolvedValue(undefined)

      await ensureTemplates()

      expect(copyFile).toHaveBeenCalledTimes(2)
    })

    it('handles missing bundled templates directory', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'))

      await expect(ensureTemplates()).resolves.not.toThrow()
    })

    it('ignores copy errors', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(readdir).mockResolvedValue(['test.md'] as unknown as import('node:fs').Dirent[])
      vi.mocked(copyFile).mockRejectedValue(new Error('EACCES'))

      await expect(ensureTemplates()).resolves.not.toThrow()
    })
  })

  describe('loadTemplate', () => {
    it('loads template from user templates directory', async () => {
      vi.mocked(readFile).mockResolvedValue('template content')

      const result = await loadTemplate('my-template')

      expect(readFile).toHaveBeenCalledWith(
        '/home/test/.ralph/templates/my-template.md',
        'utf-8'
      )
      expect(result).toBe('template content')
    })

    it('throws when template not found', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))

      await expect(loadTemplate('missing')).rejects.toThrow()
    })
  })

  describe('substituteVars', () => {
    it('replaces $VAR with value', () => {
      const result = substituteVars('Hello $NAME!', { NAME: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('replaces multiple occurrences', () => {
      const result = substituteVars('$A and $A', { A: 'X' })
      expect(result).toBe('X and X')
    })

    it('replaces multiple variables', () => {
      const result = substituteVars('$FOO $BAR', { FOO: '1', BAR: '2' })
      expect(result).toBe('1 2')
    })

    it('leaves unknown variables unchanged', () => {
      const result = substituteVars('$KNOWN $UNKNOWN', { KNOWN: 'value' })
      expect(result).toBe('value $UNKNOWN')
    })

    it('handles empty vars', () => {
      const result = substituteVars('no vars', {})
      expect(result).toBe('no vars')
    })

    it('handles empty template', () => {
      const result = substituteVars('', { FOO: 'bar' })
      expect(result).toBe('')
    })
  })
})
