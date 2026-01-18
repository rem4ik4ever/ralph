import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import { StreamPersister, StreamPersisterOptions, StreamStatus } from './types.js'

/**
 * Persists streamed output incrementally with buffering
 */
export class StreamPersisterImpl implements StreamPersister {
  private buffer = ''
  private logPath: string
  private status: StreamStatus = 'in_progress'
  private startTime: number
  private headerWritten = false
  private writeError: Error | null = null
  private fileHandle: fs.FileHandle | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private flushIntervalMs: number
  private flushing = false // mutex for flush
  private finalized = false // guard against double finalization

  constructor(options: StreamPersisterOptions) {
    this.logPath = options.logPath
    this.startTime = Date.now()
    this.flushIntervalMs = options.flushIntervalMs ?? 100
  }

  /**
   * Starts the auto-flush timer if not already running
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return

    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.flushIntervalMs)
  }

  /**
   * Stops the auto-flush timer
   */
  private stopFlushTimer(): void {
    if (!this.flushTimer) return

    clearInterval(this.flushTimer)
    this.flushTimer = null
  }

  /**
   * Ensures file handle is open and header is written
   */
  private async ensureFile(): Promise<fs.FileHandle | null> {
    if (this.writeError) return null

    if (!this.fileHandle) {
      try {
        // Ensure directory exists
        await fs.mkdir(dirname(this.logPath), { recursive: true })

        this.fileHandle = await fs.open(this.logPath, 'w')
      } catch (err) {
        this.writeError = err instanceof Error ? err : new Error(String(err))
        console.error(`[StreamPersister] Failed to open file: ${this.writeError.message}`)
        return null
      }
    }

    if (!this.headerWritten) {
      await this.writeHeader()
      this.headerWritten = true
    }

    return this.fileHandle
  }

  /**
   * Writes the log header with in_progress status
   */
  private async writeHeader(): Promise<void> {
    const header = [
      `# Iteration Log`,
      `Timestamp: ${new Date(this.startTime).toISOString()}`,
      `Status: ${this.status}`,
      '---',
      '',
    ].join('\n')

    await this.writeToFile(header)
  }

  /**
   * Writes content to file atomically (complete string only)
   */
  private async writeToFile(content: string): Promise<void> {
    if (!this.fileHandle || this.writeError) return

    try {
      await this.fileHandle.write(content, null, 'utf8')
    } catch (err) {
      this.writeError = err instanceof Error ? err : new Error(String(err))
      console.error(`[StreamPersister] Write error: ${this.writeError.message}`)
    }
  }

  async append(content: string, isEventBoundary = false): Promise<void> {
    this.buffer += content
    this.startFlushTimer()

    if (isEventBoundary) {
      await this.flush()
    }
  }

  async appendStderr(content: string): Promise<void> {
    // Prefix each line with [stderr]
    const prefixed = content
      .split('\n')
      .map((line) => (line ? `[stderr] ${line}` : line))
      .join('\n')
    this.buffer += prefixed
    this.startFlushTimer()
  }

  async flush(): Promise<void> {
    if (!this.buffer || this.flushing) return

    this.flushing = true
    try {
      const handle = await this.ensureFile()
      if (!handle) return

      const content = this.buffer
      this.buffer = ''
      await this.writeToFile(content)
    } finally {
      this.flushing = false
    }
  }

  async complete(exitCode: number, duration: number): Promise<void> {
    if (this.finalized) return
    this.finalized = true
    this.stopFlushTimer()
    this.status = 'completed'
    await this.flush()
    await this.writeMetadata({ exitCode, duration })
    await this.close()
  }

  async abort(signal: string): Promise<void> {
    if (this.finalized) return
    this.finalized = true
    this.stopFlushTimer()
    this.status = 'aborted'
    await this.flush()
    await this.writeMetadata({ signal })
    await this.close()
  }

  async crash(error: Error): Promise<void> {
    if (this.finalized) return
    this.finalized = true
    this.stopFlushTimer()
    this.status = 'crashed'
    await this.flush()
    await this.writeMetadata({ error: error.message })
    await this.close()
  }

  /**
   * Writes final metadata section
   */
  private async writeMetadata(info: {
    exitCode?: number
    duration?: number
    signal?: string
    error?: string
  }): Promise<void> {
    const handle = await this.ensureFile()
    if (!handle) return

    const parts = ['\n---', `Status: ${this.status}`]

    if (info.exitCode !== undefined) {
      parts.push(`Exit Code: ${info.exitCode}`)
    }
    if (info.duration !== undefined) {
      parts.push(`Duration: ${info.duration}ms`)
    }
    if (info.signal) {
      parts.push(`Interrupted: ${info.signal}`)
    }
    if (info.error) {
      parts.push(`Error: ${info.error}`)
    }

    await this.writeToFile(parts.join('\n') + '\n')
  }

  /**
   * Closes the file handle
   */
  private async close(): Promise<void> {
    if (!this.fileHandle) return

    try {
      await this.fileHandle.close()
    } catch {
      // Ignore close errors
    }
    this.fileHandle = null
  }

  /**
   * Cleanup method for cases where persister is abandoned without complete/abort/crash
   */
  async destroy(): Promise<void> {
    this.stopFlushTimer()
    await this.close()
  }

  /**
   * Returns any write error that occurred
   */
  getError(): Error | null {
    return this.writeError
  }
}
