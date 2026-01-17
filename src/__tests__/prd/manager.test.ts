import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { access, copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import {
  getPrdsDir,
  getPrdDir,
  getLocalPrdDir,
  getGlobalPrdDir,
  getLocalPrdsDir,
  getGlobalPrdsDir,
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

const originalCwd = process.cwd
const mockCwd = '/project'

describe('prd/manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.cwd = () => mockCwd
  })

  afterEach(() => {
    process.cwd = originalCwd
  })

  describe('getLocalPrdsDir', () => {
    it('returns .ralph/prd in cwd', () => {
      expect(getLocalPrdsDir()).toBe('/project/.ralph/prd')
    })
  })

  describe('getGlobalPrdsDir', () => {
    it('returns ~/.ralph/prd path', () => {
      expect(getGlobalPrdsDir()).toBe('/home/test/.ralph/prd')
    })
  })

  describe('getPrdsDir', () => {
    it('returns global ~/.ralph/prd path', () => {
      expect(getPrdsDir()).toBe('/home/test/.ralph/prd')
    })
  })

  describe('getLocalPrdDir', () => {
    it('returns .ralph/prd/<name> in cwd', () => {
      expect(getLocalPrdDir('my-prd')).toBe('/project/.ralph/prd/my-prd')
    })
  })

  describe('getGlobalPrdDir', () => {
    it('returns ~/.ralph/prd/<name> path', () => {
      expect(getGlobalPrdDir('my-prd')).toBe('/home/test/.ralph/prd/my-prd')
    })
  })

  describe('getPrdDir', () => {
    it('returns local path when local exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await getPrdDir('my-prd')).toBe('/project/.ralph/prd/my-prd')
    })

    it('returns global path when local missing', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      expect(await getPrdDir('my-prd')).toBe('/home/test/.ralph/prd/my-prd')
    })
  })

  describe('prdExists', () => {
    it('returns true when local folder exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await prdExists('test-prd')).toBe(true)
    })

    it('returns true when only global folder exists', async () => {
      vi.mocked(access)
        .mockRejectedValueOnce(new Error('ENOENT')) // local
        .mockResolvedValueOnce(undefined) // global
      expect(await prdExists('test-prd')).toBe(true)
    })

    it('returns false when both folders missing', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      expect(await prdExists('test-prd')).toBe(false)
    })
  })

  describe('createPrdFolder', () => {
    it('creates directory at local path when local exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd')
      expect(mkdir).toHaveBeenCalledWith('/project/.ralph/prd/new-prd', { recursive: true })
    })

    it('creates directory at global path when local missing', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd')
      expect(mkdir).toHaveBeenCalledWith('/home/test/.ralph/prd/new-prd', { recursive: true })
    })
  })

  describe('copyMarkdown', () => {
    it('copies source file to local prd.md when local exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      await copyMarkdown('/path/to/source.md', 'my-prd')
      expect(copyFile).toHaveBeenCalledWith(
        '/path/to/source.md',
        '/project/.ralph/prd/my-prd/prd.md'
      )
    })

    it('copies source file to global prd.md when local missing', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(copyFile).mockResolvedValue(undefined)
      await copyMarkdown('/path/to/source.md', 'my-prd')
      expect(copyFile).toHaveBeenCalledWith(
        '/path/to/source.md',
        '/home/test/.ralph/prd/my-prd/prd.md'
      )
    })
  })

  describe('getPrd', () => {
    it('reads and parses prd.json from local when local exists', async () => {
      const mockPrd: PrdJson = {
        prdName: 'test',
        tasks: [{ id: 't1', category: 'c', description: 'd', steps: [], passes: false }],
      }
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPrd))

      const result = await getPrd('test')

      expect(readFile).toHaveBeenCalledWith('/project/.ralph/prd/test/prd.json', 'utf-8')
      expect(result).toEqual(mockPrd)
    })

    it('reads from global when local missing', async () => {
      const mockPrd: PrdJson = {
        prdName: 'test',
        tasks: [{ id: 't1', category: 'c', description: 'd', steps: [], passes: false }],
      }
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPrd))

      const result = await getPrd('test')

      expect(readFile).toHaveBeenCalledWith('/home/test/.ralph/prd/test/prd.json', 'utf-8')
      expect(result).toEqual(mockPrd)
    })

    it('throws when prd.json not found', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))
      await expect(getPrd('missing')).rejects.toThrow()
    })
  })

  describe('listPrds', () => {
    it('returns empty array when both prd folders missing', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'))
      expect(await listPrds()).toEqual([])
    })

    it('merges local and global prds, local takes precedence', async () => {
      // First call for local, second for global
      vi.mocked(readdir)
        .mockResolvedValueOnce(['local-prd'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce(['global-prd'] as unknown as import('node:fs').Dirent[])

      const localPrd: PrdJson = {
        prdName: 'local-prd',
        tasks: [{ id: 't1', category: 'c', description: 'Local task', steps: [], passes: false }],
      }
      const globalPrd: PrdJson = {
        prdName: 'global-prd',
        tasks: [{ id: 't1', category: 'c', description: 'Global task', steps: [], passes: true }],
      }

      // getPrdDir calls access to check local first
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // local-prd exists locally
        .mockRejectedValueOnce(new Error('ENOENT')) // global-prd not local

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(localPrd))
        .mockResolvedValueOnce(JSON.stringify(globalPrd))

      const result = await listPrds()

      expect(result).toHaveLength(2)
      expect(result.map((p) => p.name)).toContain('local-prd')
      expect(result.map((p) => p.name)).toContain('global-prd')
    })

    it('computes in_progress status correctly', async () => {
      vi.mocked(readdir)
        .mockResolvedValueOnce(['partial'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce([] as unknown as import('node:fs').Dirent[])

      vi.mocked(access).mockResolvedValueOnce(undefined)

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
      vi.mocked(readdir)
        .mockResolvedValueOnce(['valid', 'invalid'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce([] as unknown as import('node:fs').Dirent[])

      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // valid
        .mockResolvedValueOnce(undefined) // invalid

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ prdName: 'valid', tasks: [] }))
        .mockRejectedValueOnce(new Error('Invalid JSON'))

      const result = await listPrds()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('valid')
    })
  })
})
