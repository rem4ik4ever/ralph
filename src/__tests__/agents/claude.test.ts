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

  it('spawns claude with correct args', async () => {
    const promise = claude.execute('test prompt', '/test/cwd')

    mockProcess.stdout.emit('data', Buffer.from('output'))
    mockProcess.emit('close', 0)

    await promise

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      ['-p', '--dangerously-skip-permissions'],
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

  it('captures stdout', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.stdout.emit('data', Buffer.from('hello '))
    mockProcess.stdout.emit('data', Buffer.from('world'))
    mockProcess.emit('close', 0)

    const result = await promise

    expect(result.output).toBe('hello world')
  })

  it('captures stderr', async () => {
    const promise = claude.execute('test', '/cwd')

    mockProcess.stdout.emit('data', Buffer.from('out'))
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
})
