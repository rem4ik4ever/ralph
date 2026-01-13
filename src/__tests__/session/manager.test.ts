import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getRalphDir,
  getSessionsDir,
  getSessionDir,
  createSession,
} from '../../session/manager.js'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'abc123'),
}))

describe('session/manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRalphDir', () => {
    it('returns ~/.ralph path', () => {
      expect(getRalphDir()).toBe('/home/test/.ralph')
    })
  })

  describe('getSessionsDir', () => {
    it('returns ~/.ralph/sessions path', () => {
      expect(getSessionsDir()).toBe('/home/test/.ralph/sessions')
    })
  })

  describe('getSessionDir', () => {
    it('returns session directory path', () => {
      expect(getSessionDir('xyz789')).toBe('/home/test/.ralph/sessions/xyz789')
    })
  })

  describe('createSession', () => {
    it('creates session directory', async () => {
      await createSession({
        promptFiles: ['prompt.md'],
        agent: 'claude',
        iterations: 4,
      })

      expect(mkdir).toHaveBeenCalledWith(
        '/home/test/.ralph/sessions/abc123',
        { recursive: true }
      )
    })

    it('writes meta.json with correct fields', async () => {
      const originalCwd = process.cwd
      process.cwd = vi.fn(() => '/test/cwd')

      await createSession({
        promptFiles: ['prompt.md', 'context.md'],
        agent: 'claude',
        iterations: 4,
      })

      expect(writeFile).toHaveBeenCalledWith(
        '/home/test/.ralph/sessions/abc123/meta.json',
        expect.stringContaining('"promptFiles"')
      )

      const metaCall = vi.mocked(writeFile).mock.calls[0]
      const meta = JSON.parse(metaCall[1] as string)

      expect(meta.id).toBe('abc123')
      expect(meta.promptFiles).toEqual(['prompt.md', 'context.md'])
      expect(meta.agent).toBe('claude')
      expect(meta.cwd).toBe('/test/cwd')
      expect(meta.iterations).toBe(4)
      expect(meta.startTime).toBeDefined()

      process.cwd = originalCwd
    })

    it('returns session ID', async () => {
      const sessionId = await createSession({
        promptFiles: ['test.md'],
        agent: 'claude',
        iterations: 1,
      })

      expect(sessionId).toBe('abc123')
    })

    it('handles single prompt file', async () => {
      await createSession({
        promptFiles: ['task.md'],
        agent: 'claude',
        iterations: 1,
      })

      const metaCall = vi.mocked(writeFile).mock.calls[0]
      const meta = JSON.parse(metaCall[1] as string)

      expect(meta.promptFiles).toEqual(['task.md'])
    })
  })
})
