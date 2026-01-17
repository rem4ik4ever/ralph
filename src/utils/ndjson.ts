/**
 * Handles streaming NDJSON parsing with line buffering
 */
export class NDJSONParser<T> {
  private buffer = ''
  private onEvent: (event: T) => void
  private onError: (error: Error, line: string) => void

  constructor(
    onEvent: (event: T) => void,
    onError?: (error: Error, line: string) => void
  ) {
    this.onEvent = onEvent
    this.onError = onError ?? (() => {})
  }

  push(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')

    // Keep incomplete last line in buffer
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const event = JSON.parse(trimmed) as T
        this.onEvent(event)
      } catch (err) {
        this.onError(err instanceof Error ? err : new Error(String(err)), trimmed)
      }
    }
  }

  flush(): void {
    if (this.buffer.trim()) {
      try {
        const event = JSON.parse(this.buffer.trim()) as T
        this.onEvent(event)
      } catch (err) {
        this.onError(err instanceof Error ? err : new Error(String(err)), this.buffer)
      }
    }
    this.buffer = ''
  }
}
