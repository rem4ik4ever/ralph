import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { claude } from '../../agents/claude.js'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

class MockProcess extends EventEmitter {
  stdin = {
    write: vi.fn(),
    end: vi.fn(),
  }
  stdout = new EventEmitter()
  stderr = new EventEmitter()
}

describe('agents/claude', () => {
  let mockProcess: MockProcess

  beforeEach(() => {
    mockProcess = new MockProcess()
    vi.mocked(spawn).mockReturnValue(mockProcess as unknown as ChildProcess)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('has correct name', () => {
    expect(claude.name).toBe('claude')
  })

  it('spawns claude with stream-json flag', async () => {
    const promise = claude.execute('test prompt', '/test/cwd')

    mockProcess.stdout.emit('data', Buffer.from('{"type":"result","subtype":"success","is_error":false,"duration_ms":100}\n'))
    mockProcess.emit('close', 0)

    await promise

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      ['-p', '--verbose', '--dangerously-skip-permissions', '--output-format', 'stream-json'],
      expect.objectContaining({
        cwd: '/test/cwd',
        shell: true,
      })
    )
  })

  it('pipes prompt to stdin', async () => {
    const promise = claude.execute('test prompt', '/test/cwd')

    mockProcess.emit('close', 0)

    await promise

    expect(mockProcess.stdin.write).toHaveBeenCalledWith('test prompt')
    expect(mockProcess.stdin.end).toHaveBeenCalled()
  })

  it('parses text content from assistant events', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hello world"}]}}\n'
    ))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.output).toContain('hello world')
  })

  it('accumulates text from multiple events', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"part1"}]}}\n'
    ))
    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"part2"}]}}\n'
    ))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.output).toContain('part1')
    expect(result.output).toContain('part2')
  })

  it('captures stderr', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"out"}]}}\n'
    ))
    mockProcess.stderr.emit('data', Buffer.from('err'))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.output).toContain('out')
    expect(result.output).toContain('[stderr]')
    expect(result.output).toContain('err')
  })

  it('returns exit code', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.emit('close', 1)

    const result = await promise

    expect(result.exitCode).toBe(1)
  })

  it('returns duration', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('rejects on spawn error', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.emit('error', new Error('spawn failed'))

    await expect(promise).rejects.toThrow('Failed to spawn claude: spawn failed')
  })

  it('handles null exit code', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.emit('close', null)

    const result = await promise

    expect(result.exitCode).toBe(1)
  })

  it('formats tool_use events', async () => {
    const onOutput = vi.fn()
    const promise = claude.execute('test', '/cwd', { onOutput })

    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"1","name":"Read","input":{"file_path":"/test"}}]}}\n'
    ))
    mockProcess.emit('close', 0)

    await promise

    expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('[tool] Read'))
  })

  it('formats system init events', async () => {
    const onOutput = vi.fn()
    const promise = claude.execute('test', '/cwd', { onOutput })

    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"system","subtype":"init","session_id":"abc123","tools":[],"model":"claude-sonnet"}\n'
    ))
    mockProcess.emit('close', 0)

    await promise

    expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('[session] abc123'))
  })

  it('handles malformed JSON gracefully', async () => {
    const onOutput = vi.fn()
    const promise = claude.execute('test', '/cwd', { onOutput })

    mockProcess.stdout.emit('data', Buffer.from('not valid json\n'))
    mockProcess.stdout.emit('data', Buffer.from(
      '{"type":"assistant","message":{"content":[{"type":"text","text":"ok"}]}}\n'
    ))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.output).toContain('ok')
    expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('[warn]'))
  })
})
