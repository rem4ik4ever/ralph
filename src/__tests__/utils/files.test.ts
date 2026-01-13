import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { readContextFiles, buildPrompt } from '../../utils/files.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

describe('utils/files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readContextFiles', () => {
    it('reads single file', async () => {
      vi.mocked(readFile).mockResolvedValue('file content')

      const result = await readContextFiles(['test.md'])

      expect(readFile).toHaveBeenCalledTimes(1)
      expect(result).toContain('# File: test.md')
      expect(result).toContain('file content')
    })

    it('reads multiple files', async () => {
      vi.mocked(readFile)
        .mockResolvedValueOnce('content 1')
        .mockResolvedValueOnce('content 2')

      const result = await readContextFiles(['file1.md', 'file2.md'])

      expect(readFile).toHaveBeenCalledTimes(2)
      expect(result).toContain('# File: file1.md')
      expect(result).toContain('content 1')
      expect(result).toContain('# File: file2.md')
      expect(result).toContain('content 2')
    })

    it('concatenates files with newlines', async () => {
      vi.mocked(readFile)
        .mockResolvedValueOnce('a')
        .mockResolvedValueOnce('b')

      const result = await readContextFiles(['1.md', '2.md'])

      expect(result).toContain('\n\n')
    })

    it('throws on missing file', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))

      await expect(readContextFiles(['missing.md'])).rejects.toThrow('ENOENT')
    })

    it('handles empty file', async () => {
      vi.mocked(readFile).mockResolvedValue('')

      const result = await readContextFiles(['empty.md'])

      expect(result).toContain('# File: empty.md')
    })
  })

  describe('buildPrompt', () => {
    it('returns task only when no context files', async () => {
      const result = await buildPrompt('my task')

      expect(result).toBe('my task')
    })

    it('returns task only when context files is empty array', async () => {
      const result = await buildPrompt('my task', [])

      expect(result).toBe('my task')
    })

    it('combines task and context files', async () => {
      vi.mocked(readFile).mockResolvedValue('context content')

      const result = await buildPrompt('my task', ['context.md'])

      expect(result).toContain('my task')
      expect(result).toContain('---')
      expect(result).toContain('context content')
    })

    it('task comes before context', async () => {
      vi.mocked(readFile).mockResolvedValue('context')

      const result = await buildPrompt('task', ['file.md'])

      expect(result.indexOf('task')).toBeLessThan(result.indexOf('context'))
    })
  })
})
