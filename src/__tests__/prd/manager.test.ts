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
  getPrdFileStatus,
  createPrdFolder,
  copyMarkdown,
  getPrd,
  listPrds,
  isProjectInitialized,
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

  describe('isProjectInitialized', () => {
    it('returns true when .ralph dir exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await isProjectInitialized()).toBe(true)
      expect(access).toHaveBeenCalledWith('/project/.ralph')
    })

    it('returns false when .ralph dir missing', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      expect(await isProjectInitialized()).toBe(false)
    })
  })

  describe('getPrdDir', () => {
    describe('read mode (default)', () => {
      it('returns local path when local PRD exists', async () => {
        vi.mocked(access).mockResolvedValueOnce(undefined)
        expect(await getPrdDir('my-prd')).toBe('/project/.ralph/prd/my-prd')
      })

      it('returns global path when local PRD missing', async () => {
        vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
        expect(await getPrdDir('my-prd')).toBe('/home/test/.ralph/prd/my-prd')
      })
    })

    describe('write mode', () => {
      it('returns local path when project initialized', async () => {
        vi.mocked(access).mockResolvedValueOnce(undefined) // .ralph exists
        expect(await getPrdDir('my-prd', 'write')).toBe('/project/.ralph/prd/my-prd')
      })

      it('returns global path when project not initialized', async () => {
        vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT')) // .ralph missing
        expect(await getPrdDir('my-prd', 'write')).toBe('/home/test/.ralph/prd/my-prd')
      })
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

    it('checks only local when location=local', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await prdExists('test-prd', 'local')).toBe(true)
      expect(access).toHaveBeenCalledWith('/project/.ralph/prd/test-prd')
    })

    it('checks only global when location=global', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await prdExists('test-prd', 'global')).toBe(true)
      expect(access).toHaveBeenCalledWith('/home/test/.ralph/prd/test-prd')
    })
  })

  describe('getPrdFileStatus', () => {
    it('returns none when directory does not exist', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      expect(await getPrdFileStatus('test-prd', 'local')).toBe('none')
    })

    it('returns none when directory exists but no prd.md', async () => {
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // dir exists
        .mockRejectedValueOnce(new Error('ENOENT')) // no prd.md
        .mockRejectedValueOnce(new Error('ENOENT')) // no prd.json
        .mockRejectedValueOnce(new Error('ENOENT')) // no progress.txt
      expect(await getPrdFileStatus('test-prd', 'local')).toBe('none')
    })

    it('returns partial when only prd.md exists', async () => {
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // dir exists
        .mockResolvedValueOnce(undefined) // prd.md exists
        .mockRejectedValueOnce(new Error('ENOENT')) // no prd.json
        .mockRejectedValueOnce(new Error('ENOENT')) // no progress.txt
      expect(await getPrdFileStatus('test-prd', 'local')).toBe('partial')
    })

    it('returns complete when all three files exist', async () => {
      vi.mocked(access).mockResolvedValue(undefined) // all checks pass
      expect(await getPrdFileStatus('test-prd', 'local')).toBe('complete')
    })

    it('returns partial when prd.md + prd.json exist but no progress.txt', async () => {
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // dir exists
        .mockResolvedValueOnce(undefined) // prd.md exists
        .mockResolvedValueOnce(undefined) // prd.json exists
        .mockRejectedValueOnce(new Error('ENOENT')) // no progress.txt
      expect(await getPrdFileStatus('test-prd', 'local')).toBe('partial')
    })

    it('checks local path when location=local', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      await getPrdFileStatus('test-prd', 'local')
      expect(access).toHaveBeenCalledWith('/project/.ralph/prd/test-prd')
    })

    it('checks global path when location=global', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      await getPrdFileStatus('test-prd', 'global')
      expect(access).toHaveBeenCalledWith('/home/test/.ralph/prd/test-prd')
    })
  })

  describe('createPrdFolder', () => {
    it('creates at local path when project initialized (auto)', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined) // .ralph exists
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd')
      expect(mkdir).toHaveBeenCalledWith('/project/.ralph/prd/new-prd', { recursive: true })
    })

    it('creates at global path when project not initialized (auto)', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT')) // .ralph missing
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd')
      expect(mkdir).toHaveBeenCalledWith('/home/test/.ralph/prd/new-prd', { recursive: true })
    })

    it('creates at local path when location=local', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd', 'local')
      expect(mkdir).toHaveBeenCalledWith('/project/.ralph/prd/new-prd', { recursive: true })
    })

    it('creates at global path when location=global', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)
      await createPrdFolder('new-prd', 'global')
      expect(mkdir).toHaveBeenCalledWith('/home/test/.ralph/prd/new-prd', { recursive: true })
    })

    it('throws when mkdir fails', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(mkdir).mockRejectedValue(new Error('EACCES'))
      await expect(createPrdFolder('new-prd')).rejects.toThrow('EACCES')
    })
  })

  describe('copyMarkdown', () => {
    it('copies to local prd.md when project initialized', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined) // .ralph exists
      vi.mocked(copyFile).mockResolvedValue(undefined)
      await copyMarkdown('/path/to/source.md', 'my-prd')
      expect(copyFile).toHaveBeenCalledWith(
        '/path/to/source.md',
        '/project/.ralph/prd/my-prd/prd.md'
      )
    })

    it('copies to global prd.md when project not initialized', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT')) // .ralph missing
      vi.mocked(copyFile).mockResolvedValue(undefined)
      await copyMarkdown('/path/to/source.md', 'my-prd')
      expect(copyFile).toHaveBeenCalledWith(
        '/path/to/source.md',
        '/home/test/.ralph/prd/my-prd/prd.md'
      )
    })

    it('throws when copyFile fails', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(copyFile).mockRejectedValue(new Error('EACCES'))
      await expect(copyMarkdown('/path/to/source.md', 'my-prd')).rejects.toThrow('EACCES')
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

    it('throws PRD not found error on ENOENT', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      vi.mocked(readFile).mockRejectedValue(err)
      await expect(getPrd('missing')).rejects.toThrow('PRD not found: missing')
    })

    it('throws permission denied on EACCES', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'))
      const err = Object.assign(new Error('EACCES'), { code: 'EACCES' })
      vi.mocked(readFile).mockRejectedValue(err)
      await expect(getPrd('protected')).rejects.toThrow('Permission denied')
    })

    it('throws invalid JSON error with file path', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      vi.mocked(readFile).mockResolvedValue('not valid json')
      await expect(getPrd('broken')).rejects.toThrow(
        'Invalid JSON in PRD file: /project/.ralph/prd/broken/prd.json'
      )
    })
  })

  describe('listPrds', () => {
    it('returns empty array when both prd folders missing', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'))
      expect(await listPrds()).toEqual([])
    })

    it('merges local and global prds with location info', async () => {
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

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(localPrd))
        .mockResolvedValueOnce(JSON.stringify(globalPrd))

      const result = await listPrds()

      expect(result).toHaveLength(2)
      const localResult = result.find((p) => p.name === 'local-prd')
      const globalResult = result.find((p) => p.name === 'global-prd')
      expect(localResult?.location).toBe('local')
      expect(globalResult?.location).toBe('global')
    })

    it('local shadows global with same name', async () => {
      vi.mocked(readdir)
        .mockResolvedValueOnce(['shared-prd'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce(['shared-prd'] as unknown as import('node:fs').Dirent[])

      const prd: PrdJson = {
        prdName: 'shared-prd',
        tasks: [{ id: 't1', category: 'c', description: 'Task', steps: [], passes: false }],
      }

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(prd))

      const result = await listPrds()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('shared-prd')
      expect(result[0].location).toBe('local')
    })

    it('computes in_progress status correctly', async () => {
      vi.mocked(readdir)
        .mockResolvedValueOnce(['partial'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce([] as unknown as import('node:fs').Dirent[])

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
      expect(result[0].location).toBe('local')
    })

    it('skips invalid prd folders', async () => {
      vi.mocked(readdir)
        .mockResolvedValueOnce(['valid', 'invalid'] as unknown as import('node:fs').Dirent[])
        .mockResolvedValueOnce([] as unknown as import('node:fs').Dirent[])

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify({ prdName: 'valid', tasks: [] }))
        .mockRejectedValueOnce(new Error('Invalid JSON'))

      const result = await listPrds()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('valid')
    })
  })
})
