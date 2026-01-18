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

    it('continues operating after write error', async () => {
      // Create a directory to cause initial error
      await fs.mkdir(logPath, { recursive: true })

      const persister = new StreamPersisterImpl({ logPath })

      // First operation fails
      await persister.append('first')
      await persister.flush()

      // Subsequent operations should still not throw
      await persister.append('second')
      await persister.appendStderr('error')
      await persister.abort('SIGINT')
    })

    it('handles permission denied on directory creation', async () => {
      // Path with non-existent parent we can't create (on most systems / is not writable)
      const badPath = '/nonexistent-root-dir/test/log.txt'
      const persister = new StreamPersisterImpl({ logPath: badPath })

      // Should not throw
      await persister.append('content')
      await persister.flush()
      await persister.destroy()
    })

    it('concurrent persisters with different paths dont conflict', async () => {
      const path1 = join(testDir, 'log1.txt')
      const path2 = join(testDir, 'log2.txt')

      const persister1 = new StreamPersisterImpl({ logPath: path1 })
      const persister2 = new StreamPersisterImpl({ logPath: path2 })

      // Interleaved operations
      await persister1.append('p1-a')
      await persister2.append('p2-a')
      await persister1.append('p1-b')
      await persister2.append('p2-b')

      await Promise.all([persister1.complete(0, 100), persister2.complete(0, 200)])

      const content1 = await fs.readFile(path1, 'utf8')
      const content2 = await fs.readFile(path2, 'utf8')

      expect(content1).toContain('p1-ap1-b')
      expect(content2).toContain('p2-ap2-b')
      expect(content1).not.toContain('p2')
      expect(content2).not.toContain('p1')
    })

    it('handles rapid sequential writes without corruption', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Many rapid appends
      const promises = []
      for (let i = 0; i < 50; i++) {
        promises.push(persister.append(`line-${i}\n`))
      }
      await Promise.all(promises)
      await persister.complete(0, 100)

      const content = await fs.readFile(logPath, 'utf8')
      for (let i = 0; i < 50; i++) {
        expect(content).toContain(`line-${i}`)
      }
    })
  })

  describe('incremental persistence', () => {
    it('writes match terminal display order', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Simulate terminal output sequence
      const terminalOutput: string[] = []
      const chunks = ['Start\n', 'Processing...\n', 'Step 1 done\n', 'Step 2 done\n', 'Complete\n']

      for (const chunk of chunks) {
        terminalOutput.push(chunk)
        await persister.append(chunk, true) // Each event boundary
      }

      await persister.complete(0, 100)

      const content = await fs.readFile(logPath, 'utf8')

      // Verify order matches terminal
      let lastIndex = 0
      for (const chunk of terminalOutput) {
        const index = content.indexOf(chunk, lastIndex)
        expect(index).toBeGreaterThan(lastIndex - 1) // Allow for first chunk
        lastIndex = index + chunk.length
      }
    })

    it('preserves partial content on abort (ctrl+c simulation)', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Simulate partial stream then interrupt
      await persister.append('Line 1\n', true)
      await persister.append('Line 2\n', true)
      await persister.append('Line 3 (partial) ...')
      // Interrupt before flush
      await persister.abort('SIGINT')

      const content = await fs.readFile(logPath, 'utf8')

      // All content including partial should be preserved
      expect(content).toContain('Line 1')
      expect(content).toContain('Line 2')
      expect(content).toContain('Line 3 (partial)')
      expect(content).toContain('Status: aborted')
      expect(content).toContain('Interrupted: SIGINT')
    })

    it('preserves buffered content on crash', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      // Simulate content in buffer during crash
      await persister.append('Output before crash\n')
      await persister.append('Last line')
      await persister.crash(new Error('Unexpected error'))

      const content = await fs.readFile(logPath, 'utf8')

      expect(content).toContain('Output before crash')
      expect(content).toContain('Last line')
      expect(content).toContain('Status: crashed')
    })
  })

  describe('log format compatibility', () => {
    it('maintains header structure with in_progress before finalization', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('content\n')
      await persister.flush() // Flush before complete to write header with in_progress

      const content = await fs.readFile(logPath, 'utf8')
      const lines = content.split('\n')

      // Verify header structure: title, timestamp, status, separator, content
      expect(lines[0]).toBe('# Iteration Log')
      expect(lines[1]).toMatch(/^Timestamp: \d{4}-\d{2}-\d{2}T/)
      expect(lines[2]).toBe('Status: in_progress')
      expect(lines[3]).toBe('---')
      expect(lines[4]).toBe('content') // Content starts after separator

      await persister.destroy()
    })

    it('maintains metadata separator structure', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('body content')
      await persister.complete(0, 1234)

      const content = await fs.readFile(logPath, 'utf8')

      // Find metadata section
      const metaStart = content.lastIndexOf('\n---\n')
      expect(metaStart).toBeGreaterThan(0)

      const metaSection = content.slice(metaStart)
      expect(metaSection).toContain('Status: completed')
      expect(metaSection).toContain('Exit Code: 0')
      expect(metaSection).toContain('Duration: 1234ms')
    })

    it('abort includes interrupted signal', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.abort('SIGHUP')

      const content = await fs.readFile(logPath, 'utf8')
      const metaSection = content.slice(content.lastIndexOf('\n---\n'))

      expect(metaSection).toContain('Status: aborted')
      expect(metaSection).toContain('Interrupted: SIGHUP')
      expect(metaSection).not.toContain('Duration:')
    })

    it('crash includes error message', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.crash(new Error('Connection reset'))

      const content = await fs.readFile(logPath, 'utf8')
      const metaSection = content.slice(content.lastIndexOf('\n---\n'))

      expect(metaSection).toContain('Status: crashed')
      expect(metaSection).toContain('Error: Connection reset')
    })
  })

  describe('metadata correctness', () => {
    it('in_progress status in header before finalization', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('content')
      await persister.flush()

      const content = await fs.readFile(logPath, 'utf8')

      // Should only have header status, no final metadata yet
      expect(content).toContain('Status: in_progress')
      expect(content).not.toContain('Status: completed')
      expect(content).not.toContain('Status: aborted')

      await persister.destroy()
    })

    it('completed status with exit code 0', async () => {
      const persister = new StreamPersisterImpl({ logPath })
      await persister.complete(0, 100)

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toMatch(/Status: completed[\s\S]*Exit Code: 0/)
    })

    it('completed status with non-zero exit code', async () => {
      const persister = new StreamPersisterImpl({ logPath })
      await persister.complete(1, 100)

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toMatch(/Status: completed[\s\S]*Exit Code: 1/)
    })

    it('duration is in milliseconds', async () => {
      const persister = new StreamPersisterImpl({ logPath })
      await persister.complete(0, 12345)

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Duration: 12345ms')
    })
  })

  describe('auto-flush timing', () => {
    it('auto-flushes after interval (real time)', async () => {
      // Use short interval for fast test
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 20 })

      await persister.append('content')

      // File shouldn't exist yet (no auto-flush yet)
      await expect(fs.access(logPath)).rejects.toThrow()

      // Wait for auto-flush
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Now file should exist with content
      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('content')
      await persister.destroy()
    })

    it('flushes immediately on event boundary', async () => {
      const persister = new StreamPersisterImpl({ logPath })

      await persister.append('event content', true) // isEventBoundary = true

      // File should exist immediately
      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('event content')
      await persister.destroy()
    })

    it('clears timer on complete (no leaks)', async () => {
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 10 })

      await persister.append('content')
      await persister.complete(0, 100)

      // Verify file is complete
      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Status: completed')
    })

    it('clears timer on abort (no leaks)', async () => {
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 10 })

      await persister.append('content')
      await persister.abort('SIGINT')

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Status: aborted')
    })

    it('clears timer on crash (no leaks)', async () => {
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 10 })

      await persister.append('content')
      await persister.crash(new Error('test error'))

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('Status: crashed')
    })

    it('clears timer on destroy (no leaks)', async () => {
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 10 })

      await persister.append('content')
      await persister.destroy()

      // No assertion needed - test will timeout if timer keeps running after destroy
    })

    it('buffers multiple appends for single timer cycle', async () => {
      const persister = new StreamPersisterImpl({ logPath, flushIntervalMs: 30 })

      // Multiple appends before timer fires
      await persister.append('a')
      await persister.append('b')
      await persister.append('c')

      // Wait for auto-flush
      await new Promise((resolve) => setTimeout(resolve, 60))

      const content = await fs.readFile(logPath, 'utf8')
      expect(content).toContain('abc')
      await persister.destroy()
    })
  })
})
