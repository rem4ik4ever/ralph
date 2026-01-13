import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFile, access } from 'node:fs/promises'
import { readPromptFiles, buildPrompt, COMPLETION_MARKER } from '../../utils/files.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}))

describe('utils/files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readPromptFiles', () => {
    it('reads file when it exists', async () => {
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue('file content')

      const result = await readPromptFiles(['test.md'])

      expect(readFile).toHaveBeenCalledTimes(1)
      expect(result).toBe('file content')
    })

    it('uses text directly when file does not exist', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))

      const result = await readPromptFiles(['fix the bug'])

      expect(readFile).not.toHaveBeenCalled()
      expect(result).toBe('fix the bug')
    })

    it('handles mix of files and text', async () => {
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // first is file
        .mockRejectedValueOnce(new Error('ENOENT')) // second is text
      vi.mocked(readFile).mockResolvedValue('file content')

      const result = await readPromptFiles(['prompt.md', 'also do this task'])

      expect(readFile).toHaveBeenCalledTimes(1)
      expect(result).toBe('file content\n\nalso do this task')
    })

    it('reads multiple files', async () => {
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile)
        .mockResolvedValueOnce('content 1')
        .mockResolvedValueOnce('content 2')

      const result = await readPromptFiles(['file1.md', 'file2.md'])

      expect(readFile).toHaveBeenCalledTimes(2)
      expect(result).toBe('content 1\n\ncontent 2')
    })

    it('handles multiple text inputs', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))

      const result = await readPromptFiles(['task one', 'task two'])

      expect(result).toBe('task one\n\ntask two')
    })

    it('handles empty file', async () => {
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue('')

      const result = await readPromptFiles(['empty.md'])

      expect(result).toBe('')
    })
  })

  describe('buildPrompt', () => {
    it('appends completion instructions', async () => {
      vi.mocked(access).mockResolvedValue(undefined)
      vi.mocked(readFile).mockResolvedValue('my task')

      const result = await buildPrompt(['task.md'])

      expect(result).toContain('my task')
      expect(result).toContain(COMPLETION_MARKER)
    })

    it('includes completion marker in instructions', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))

      const result = await buildPrompt(['do something'])

      expect(result).toContain('<ralph>RALPH_COMPLETED</ralph>')
    })
  })

  describe('COMPLETION_MARKER', () => {
    it('exports correct marker', () => {
      expect(COMPLETION_MARKER).toBe('<ralph>RALPH_COMPLETED</ralph>')
    })
  })
})
