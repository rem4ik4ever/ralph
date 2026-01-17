import { describe, it, expect, vi, beforeEach } from 'vitest'
import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import {
  getPrdsDir,
  getPrdDir,
  prdExists,
  createPrdFolder,
  copyMarkdown,
  getPrd,
  listPrds,
} from '../../prd/manager.js'
import type { PrdJson } from '../../prd/types.js'

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

describe('prd/manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPrdsDir', () => {
    it('returns ~/.ralph/prd path', () => {
      expect(getPrdsDir()).toBe('/home/test/.ralph/prd')
    })
  })

  describe('getPrdDir', () => {
    it('returns ~/.ralph/prd/<name> path', () => {
      expect(getPrdDir('my-prd')).toBe('/home/test/.ralph/prd/my-prd')
    })
  })

  describe('prdExists', () => {
    it('returns true when folder exists', async () => {
      vi.mocked(access).mockResolvedValue(undefined)
      expect(await prdExists('test-prd')).toBe(true)
    })

    it('returns false when folder missing', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      expect(await prdExists('test-prd')).toBe(false)
    })
  })

  describe('createPrdFolder', () => {
    it('creates directory recursively', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd')
      expect(mkdir).toHaveBeenCalledWith('/home/test/.ralph/prd/new-prd', { recursive: true })
    })
  })

  describe('copyMarkdown', () => {
    it('copies source file to prd.md', async () => {
      vi.mocked(copyFile).mockResolvedValue(undefined)
      await copyMarkdown('/path/to/source.md', 'my-prd')
      expect(copyFile).toHaveBeenCalledWith(
        '/path/to/source.md',
        '/home/test/.ralph/prd/my-prd/prd.md'
      )
    })
  })

  describe('getPrd', () => {
    it('reads and parses prd.json', async () => {
      const mockPrd: PrdJson = {
        prdName: 'test',
        tasks: [{ id: 't1', category: 'c', description: 'd', steps: [], passes: false }],
      }
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPrd))

      const result = await getPrd('test')

      expect(readFile).toHaveBeenCalledWith('/home/test/.ralph/prd/test/prd.json', 'utf-8')
      expect(result).toEqual(mockPrd)
    })

    it('throws when prd.json not found', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))
      await expect(getPrd('missing')).rejects.toThrow()
    })
  })

  describe('listPrds', () => {
    it('returns empty array when prd folder missing', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'))
      expect(await listPrds()).toEqual([])
    })

    it('returns status for each valid prd', async () => {
      vi.mocked(readdir).mockResolvedValue(['prd1', 'prd2'] as unknown as import('node:fs').Dirent[])

      const prd1: PrdJson = {
        prdName: 'prd1',
        tasks: [
          { id: 't1', category: 'c', description: 'First task', steps: [], passes: false },
        ],
      }
      const prd2: PrdJson = {
        prdName: 'prd2',
        tasks: [
          { id: 't1', category: 'c', description: 'Second task', steps: [], passes: true },
          { id: 't2', category: 'c', description: 'd', steps: [], passes: true },
        ],
      }

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(prd1))
        .mockResolvedValueOnce(JSON.stringify(prd2))

      const result = await listPrds()

      expect(result).toEqual([
        { name: 'prd1', description: 'First task', status: 'pending', tasksTotal: 1, tasksCompleted: 0 },
        { name: 'prd2', description: 'Second task', status: 'completed', tasksTotal: 2, tasksCompleted: 2 },
      ])
    })

    it('computes in_progress status correctly', async () => {
      vi.mocked(readdir).mockResolvedValue(['partial'] as unknown as import('node:fs').Dirent[])

      const prd: PrdJson = {
        prdName: 'partial',
        tasks: [
          { id: 't1', category: 'c', description: 'd1', steps: [], passes: true },
          { id: 't2', category: 'c', description: 'd2', steps: [], passes: false },
        ],
      }
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(prd))

      const result = await listPrds()

      expect(result[0].status).toBe('in_progress')
      expect(result[0].tasksCompleted).toBe(1)
    })

    it('skips invalid prd folders', async () => {
      vi.mocked(readdir).mockResolvedValue(['valid', 'invalid'] as unknown as import('node:fs').Dirent[])
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ prdName: 'valid', tasks: [] }))
        .mockRejectedValueOnce(new Error('Invalid JSON'))

      const result = await listPrds()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('valid')
    })
  })
})
