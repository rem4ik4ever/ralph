import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { run } from '../../commands/run.js'
import * as agents from '../../agents/index.js'
import * as session from '../../session/index.js'
import * as utils from '../../utils/index.js'

vi.mock('../../agents/index.js', () => ({
  getAgent: vi.fn(),
  isValidAgent: vi.fn(),
}))

vi.mock('../../session/index.js', () => ({
  createSession: vi.fn(),
  writeLog: vi.fn(),
  getSessionDir: vi.fn(),
}))

vi.mock('../../utils/index.js', () => ({
  buildPrompt: vi.fn(),
}))

describe('commands/run', () => {
  const mockAgent = {
    name: 'claude',
    execute: vi.fn(),
  }

  let mockExit: ReturnType<typeof vi.spyOn>
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(agents.isValidAgent).mockReturnValue(true)
    vi.mocked(agents.getAgent).mockReturnValue(mockAgent)
    vi.mocked(session.createSession).mockResolvedValue('session123')
    vi.mocked(session.getSessionDir).mockReturnValue('/home/.ralph/sessions/session123')
    vi.mocked(utils.buildPrompt).mockResolvedValue('test prompt')
    mockAgent.execute.mockResolvedValue({
      output: 'done',
      exitCode: 0,
      duration: 100,
    })

    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    mockExit.mockRestore()
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  it('validates agent type', async () => {
    vi.mocked(agents.isValidAgent).mockReturnValue(false)

    await expect(run({
      task: 'test',
      agent: 'invalid',
      iterations: '1',
    })).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates iterations is positive number', async () => {
    await expect(run({
      task: 'test',
      agent: 'claude',
      iterations: '0',
    })).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates iterations is a number', async () => {
    await expect(run({
      task: 'test',
      agent: 'claude',
      iterations: 'abc',
    })).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('handles context file read errors', async () => {
    vi.mocked(utils.buildPrompt).mockRejectedValue(new Error('File not found'))

    await expect(run({
      task: 'test',
      agent: 'claude',
      iterations: '1',
      context: ['missing.md'],
    })).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('creates session with correct options', async () => {
    await run({
      task: 'my task',
      agent: 'claude',
      iterations: '3',
      context: ['file.md'],
    })

    expect(session.createSession).toHaveBeenCalledWith({
      task: 'my task',
      agent: 'claude',
      iterations: 3,
      contextFiles: ['file.md'],
    })
  })

  it('runs correct number of iterations', async () => {
    await run({
      task: 'test',
      agent: 'claude',
      iterations: '3',
    })

    expect(mockAgent.execute).toHaveBeenCalledTimes(3)
  })

  it('writes log after each iteration', async () => {
    await run({
      task: 'test',
      agent: 'claude',
      iterations: '2',
    })

    expect(session.writeLog).toHaveBeenCalledTimes(2)
    expect(session.writeLog).toHaveBeenCalledWith('session123', 0, expect.any(Object))
    expect(session.writeLog).toHaveBeenCalledWith('session123', 1, expect.any(Object))
  })

  it('passes built prompt to agent', async () => {
    vi.mocked(utils.buildPrompt).mockResolvedValue('built prompt content')

    await run({
      task: 'test',
      agent: 'claude',
      iterations: '1',
    })

    expect(mockAgent.execute).toHaveBeenCalledWith('built prompt content', expect.any(String))
  })

  it('outputs session path on completion', async () => {
    await run({
      task: 'test',
      agent: 'claude',
      iterations: '1',
    })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('/home/.ralph/sessions/session123')
    )
  })

  it('handles agent failure exit codes', async () => {
    mockAgent.execute.mockResolvedValue({
      output: 'error',
      exitCode: 1,
      duration: 100,
    })

    await run({
      task: 'test',
      agent: 'claude',
      iterations: '1',
    })

    // Should still complete, just log the error
    expect(session.writeLog).toHaveBeenCalled()
  })
})
