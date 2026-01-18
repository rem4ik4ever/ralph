import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { StreamPersisterImpl } from '../../stream/persister.js'

describe('stream/persister', () => {
  let testDir: string
  let logPath: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `stream-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await fs.mkdir(testDir, { recursive: true })
    logPath = join(testDir, 'test.log')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  describe('append and flush', () => {
    it('buffers content until flush', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Hello ')
      await persister.append('World')

      // File shouldn't exist yet (no flush)
      await expect(fs.access(logPath)).rejects.toThrow()

      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Hello World')
      await persister.destroy()
    })

    it('writes header with in_progress status on first flush', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('content')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toMatch(/^# Iteration Log/)
      expect(content).toContain('Status: in_progress')
      expect(content).toContain('Timestamp:')
      expect(content).toContain('---')
      await persister.destroy()
    })

    it('accumulates multiple appends', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Line 1\n')
      await persister.append('Line 2\n')
      await persister.append('Line 3\n')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Line 1\nLine 2\nLine 3\n')
      await persister.destroy()
    })

    it('handles empty buffer flush', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Flush with no content - should not create file
      await persister.flush()

      await expect(fs.access(logPath)).rejects.toThrow()
      // No need for destroy - file handle was never opened
    })

    it('handles multiple flushes', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Part 1')
      await persister.flush()
      await persister.append('Part 2')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Part 1')
      expect(content).toContain('Part 2')

      await persister.destroy()
    })
  })

  describe('appendStderr', () => {
    it('prefixes content with [stderr]', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.appendStderr('Error message')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('[stderr] Error message')
      await persister.destroy()
    })

    it('prefixes each line with [stderr]', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.appendStderr('Error 1\nError 2\nError 3')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('[stderr] Error 1')
      expect(content).toContain('[stderr] Error 2')
      expect(content).toContain('[stderr] Error 3')
      await persister.destroy()
    })

    it('interleaves with regular output', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('stdout 1\n')
      await persister.appendStderr('stderr\n')
      await persister.append('stdout 2\n')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('stdout 1\n[stderr] stderr\nstdout 2\n')
      await persister.destroy()
    })
  })

  describe('complete', () => {
    it('writes completed status with exit code and duration', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Output')
      await persister.complete(0, 1500)

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Output')
      expect(content).toContain('Status: completed')
      expect(content).toContain('Exit Code: 0')
      expect(content).toContain('Duration: 1500ms')
    })

    it('flushes buffer before writing metadata', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Buffered content')
      await persister.complete(0, 100)

      const content = await fs.readFile(logPath, 'utf8')
      const outputIndex = content.indexOf('Buffered content')
      const statusIndex = content.lastIndexOf('Status: completed')
      expect(outputIndex).toBeLessThan(statusIndex)
    })
  })

  describe('abort', () => {
    it('writes aborted status with signal', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Partial output')
      await persister.abort('SIGINT')

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Partial output')
      expect(content).toContain('Status: aborted')
      expect(content).toContain('Interrupted: SIGINT')
    })

    it('handles SIGTERM', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.abort('SIGTERM')

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Status: aborted')
      expect(content).toContain('Interrupted: SIGTERM')
    })
  })

  describe('crash', () => {
    it('writes crashed status with error', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('Before crash')
      await persister.crash(new Error('Uncaught exception'))

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Before crash')
      expect(content).toContain('Status: crashed')
      expect(content).toContain('Error: Uncaught exception')
    })
  })

  describe('file handle management', () => {
    it('creates directory if not exists', async () => {
      const nestedPath = join(testDir, 'nested', 'deep', 'log.txt')
      const persister = new StreamPersisterImpl({ logPath: nestedPath })

      await persister.append('content')
      await persister.flush()

      const content = await fs.readFile(nestedPath, 'utf8')
      expect(content).toContain('content')
      await persister.destroy()
    })

    it('writes complete strings (atomic)', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Simulate many appends
      for (let i = 0; i < 100; i++) {
        await persister.append(`Line ${i}\n`)
      }
      await persister.complete(0, 1000)

      const content = await fs.readFile(logPath, 'utf8')
      for (let i = 0; i < 100; i++) {
        expect(content).toContain(`Line ${i}`)
      }
    })
  })

  describe('error handling', () => {
    it('handles write errors gracefully', async () => {
      // Create a directory where file should be - causes EISDIR error
      await fs.mkdir(logPath, { recursive: true })

      const persister = new StreamPersisterImpl({ logPath })

      // Should not throw
      await persister.append('content')
      await persister.flush()
      await persister.complete(0, 100)
    })
  })
})
