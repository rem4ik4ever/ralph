import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { access, mkdir, writeFile } from 'node:fs/promises'
import {
  getRalphDir,
  getRalphPrdDir,
  getConfigPath,
  ralphDirExists,
  createProjectDirs,
  writeConfig,
} from '../../commands/init.js'

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

const originalCwd = process.cwd
const mockCwd = '/test/project'

describe('commands/init', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    process.cwd = () => mockCwd
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.cwd = originalCwd
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('getRalphDir', () => {
    it('returns .ralph in cwd', () => {
      expect(getRalphDir()).toBe('/test/project/.ralph')
    })
  })

  describe('getRalphPrdDir', () => {
    it('returns .ralph/prd in cwd', () => {
      expect(getRalphPrdDir()).toBe('/test/project/.ralph/prd')
    })
  })

  describe('getConfigPath', () => {
    it('returns .ralph/config.json in cwd', () => {
      expect(getConfigPath()).toBe('/test/project/.ralph/config.json')
    })
  })

  describe('ralphDirExists', () => {
    it('returns true when .ralph exists', async () => {
      vi.mocked(access).mockResolvedValueOnce(undefined)
      expect(await ralphDirExists()).toBe(true)
    })

    it('returns false when .ralph missing', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))
      expect(await ralphDirExists()).toBe(false)
    })
  })

  describe('createProjectDirs', () => {
    it('creates .ralph and .ralph/prd directories', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await createProjectDirs()

      expect(mkdir).toHaveBeenCalledWith('/test/project/.ralph', { recursive: true })
      expect(mkdir).toHaveBeenCalledWith('/test/project/.ralph/prd', { recursive: true })
    })

    it('logs success messages', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await createProjectDirs()

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Created'))
    })

    it('throws on permission error', async () => {
      const permError = Object.assign(new Error('EACCES'), { code: 'EACCES' })
      vi.mocked(mkdir).mockRejectedValueOnce(permError)

      await expect(createProjectDirs()).rejects.toThrow()
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'))
    })
  })

  describe('writeConfig', () => {
    it('writes config.json with agent and timestamp', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined)

      await writeConfig('claude')

      expect(writeFile).toHaveBeenCalledWith(
        '/test/project/.ralph/config.json',
        expect.stringContaining('"agent": "claude"')
      )
      expect(writeFile).toHaveBeenCalledWith(
        '/test/project/.ralph/config.json',
        expect.stringContaining('"initialized":')
      )
    })

    it('logs success message', async () => {
      vi.mocked(writeFile).mockResolvedValue(undefined)

      await writeConfig('codex')

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Saved config'))
    })

    it('throws on permission error', async () => {
      const permError = Object.assign(new Error('EACCES'), { code: 'EACCES' })
      vi.mocked(writeFile).mockRejectedValueOnce(permError)

      await expect(writeConfig('opencode')).rejects.toThrow()
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'))
    })
  })
})
