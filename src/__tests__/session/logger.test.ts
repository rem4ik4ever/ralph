import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFile } from 'node:fs/promises'
import { writeLog } from '../../session/logger.js'

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

describe('session/logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('writeLog', () => {
    it('writes log file with correct name', async () => {
      await writeLog('session123', 0, {
        output: 'test output',
        exitCode: 0,
        duration: 1000,
      })

      expect(writeFile).toHaveBeenCalledWith(
        '/home/test/.ralph/sessions/session123/0.log',
        expect.any(String)
      )
    })

    it('writes log file for different iterations', async () => {
      await writeLog('session123', 5, {
        output: 'test',
        exitCode: 0,
        duration: 100,
      })

      expect(writeFile).toHaveBeenCalledWith(
        '/home/test/.ralph/sessions/session123/5.log',
        expect.any(String)
      )
    })

    it('includes header with iteration number', async () => {
      await writeLog('session123', 3, {
        output: 'output',
        exitCode: 0,
        duration: 500,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('# Iteration 3')
    })

    it('includes duration in header', async () => {
      await writeLog('session123', 0, {
        output: 'output',
        exitCode: 0,
        duration: 1234,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('Duration: 1234ms')
    })

    it('includes exit code in header', async () => {
      await writeLog('session123', 0, {
        output: 'output',
        exitCode: 1,
        duration: 100,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('Exit Code: 1')
    })

    it('includes timestamp in header', async () => {
      await writeLog('session123', 0, {
        output: 'output',
        exitCode: 0,
        duration: 100,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('Timestamp:')
    })

    it('includes output after header', async () => {
      await writeLog('session123', 0, {
        output: 'my test output',
        exitCode: 0,
        duration: 100,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('my test output')
      expect(content.indexOf('---')).toBeLessThan(content.indexOf('my test output'))
    })

    it('handles empty output', async () => {
      await writeLog('session123', 0, {
        output: '',
        exitCode: 0,
        duration: 100,
      })

      const content = vi.mocked(writeFile).mock.calls[0][1] as string
      expect(content).toContain('# Iteration 0')
    })
  })
})
