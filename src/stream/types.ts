/**
 * Status of a stream persistence log
 */
export type StreamStatus = 'in_progress' | 'completed' | 'aborted' | 'crashed'

/**
 * Options for creating a StreamPersister
 */
export interface StreamPersisterOptions {
  /** Path to the log file */
  logPath: string
  /** Interval in ms for auto-flush (default: 100) */
  flushIntervalMs?: number
}

/**
 * Interface for persisting streamed output incrementally
 */
export interface StreamPersister {
  /**
   * Append formatted content to buffer
   * Called for each formatted event
   * @param isEventBoundary If true, triggers immediate flush
   */
  append(content: string, isEventBoundary?: boolean): Promise<void>

  /**
   * Append stderr content with [stderr] prefix
   */
  appendStderr(content: string): Promise<void>

  /**
   * Force flush buffer to disk
   */
  flush(): Promise<void>

  /**
   * Called on normal completion
   */
  complete(exitCode: number, duration: number): Promise<void>

  /**
   * Called on interruption (SIGINT, SIGTERM, SIGHUP)
   */
  abort(signal: string): Promise<void>

  /**
   * Called on crash (uncaughtException)
   */
  crash(error: Error): Promise<void>
}
