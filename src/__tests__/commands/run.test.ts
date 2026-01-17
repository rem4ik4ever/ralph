import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { run } from '../../commands/run.js'
import * as agents from '../../agents/index.js'
import * as prdManager from '../../prd/index.js'
import * as templates from '../../templates/index.js'
import * as fs from 'node:fs/promises'

vi.mock('../../agents/index.js', () => ({
  getAgent: vi.fn(),
  isValidAgent: vi.fn(),
}))

vi.mock('../../prd/index.js', () => ({
  getPrd: vi.fn(),
  getPrdDir: vi.fn(),
  prdExists: vi.fn(),
}))

vi.mock('../../templates/index.js', () => ({
  ensureTemplates: vi.fn(),
  loadTemplate: vi.fn(),
  substituteVars: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

describe('commands/run', () => {
  const mockAgent = {
    name: 'claude',
    execute: vi.fn(),
  }

  const mockPrd = {
    prdName: 'test-prd',
    tasks: [
      { id: 'task-1', passes: true },
      { id: 'task-2', passes: false },
    ],
  }

  let mockExit: ReturnType<typeof vi.spyOn>
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(agents.isValidAgent).mockReturnValue(true)
    vi.mocked(agents.getAgent).mockReturnValue(mockAgent)
    vi.mocked(prdManager.prdExists).mockResolvedValue(true)
    vi.mocked(prdManager.getPrd).mockResolvedValue(mockPrd)
    vi.mocked(prdManager.getPrdDir).mockResolvedValue('/home/.ralph/prd/test-prd')
    vi.mocked(templates.ensureTemplates).mockResolvedValue(undefined)
    vi.mocked(templates.loadTemplate).mockResolvedValue('template content')
    vi.mocked(templates.substituteVars).mockReturnValue('substituted prompt')
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
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

    await expect(
      run('test-prd', { agent: 'invalid', iterations: '1' })
    ).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates iterations is positive number', async () => {
    await expect(
      run('test-prd', { agent: 'claude', iterations: '0' })
    ).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates iterations is a number', async () => {
    await expect(
      run('test-prd', { agent: 'claude', iterations: 'abc' })
    ).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates PRD exists', async () => {
    vi.mocked(prdManager.prdExists).mockResolvedValue(false)

    await expect(
      run('missing-prd', { agent: 'claude', iterations: '1' })
    ).rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('PRD not found')
    )
  })

  it('creates iterations directory', async () => {
    await run('test-prd', { agent: 'claude', iterations: '1' })

    expect(fs.mkdir).toHaveBeenCalledWith(
      '/home/.ralph/prd/test-prd/iterations',
      { recursive: true }
    )
  })

  it('loads and substitutes template', async () => {
    await run('test-prd', { agent: 'claude', iterations: '1' })

    expect(templates.ensureTemplates).toHaveBeenCalled()
    expect(templates.loadTemplate).toHaveBeenCalledWith('complete-next-task')
    expect(templates.substituteVars).toHaveBeenCalledWith('template content', {
      PRD_NAME: 'test-prd',
      PRD_PATH: '/home/.ralph/prd/test-prd/prd.json',
      PRD_MD_PATH: '/home/.ralph/prd/test-prd/prd.md',
      CWD: expect.any(String),
    })
  })

  it('runs correct number of iterations', async () => {
    await run('test-prd', { agent: 'claude', iterations: '3' })

    expect(mockAgent.execute).toHaveBeenCalledTimes(3)
  })

  it('writes log after each iteration', async () => {
    await run('test-prd', { agent: 'claude', iterations: '2' })

    expect(fs.writeFile).toHaveBeenCalledTimes(2)
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/.ralph/prd/test-prd/iterations/0.log',
      expect.stringContaining('# Iteration 0')
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/.ralph/prd/test-prd/iterations/1.log',
      expect.stringContaining('# Iteration 1')
    )
  })

  it('passes substituted prompt to agent', async () => {
    await run('test-prd', { agent: 'claude', iterations: '1' })

    expect(mockAgent.execute).toHaveBeenCalledWith(
      'substituted prompt',
      expect.any(String),
      expect.objectContaining({ onOutput: expect.any(Function) })
    )
  })

  it('outputs logs path on completion', async () => {
    await run('test-prd', { agent: 'claude', iterations: '1' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('/home/.ralph/prd/test-prd/iterations')
    )
  })

  it('handles agent failure exit codes', async () => {
    mockAgent.execute.mockResolvedValue({
      output: 'error',
      exitCode: 1,
      duration: 100,
    })

    await run('test-prd', { agent: 'claude', iterations: '1' })

    // Should still complete, just log the error
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it('stops early when tasks complete marker found', async () => {
    mockAgent.execute.mockResolvedValue({
      output: 'done <tasks>COMPLETE</tasks>',
      exitCode: 0,
      duration: 100,
    })

    await run('test-prd', { agent: 'claude', iterations: '5' })

    // Should stop after first iteration
    expect(mockAgent.execute).toHaveBeenCalledTimes(1)
  })

  it('continues if completion marker not found', async () => {
    mockAgent.execute.mockResolvedValue({
      output: 'still working',
      exitCode: 0,
      duration: 100,
    })

    await run('test-prd', { agent: 'claude', iterations: '3' })

    expect(mockAgent.execute).toHaveBeenCalledTimes(3)
  })

  it('stops on second iteration if marker found', async () => {
    mockAgent.execute
      .mockResolvedValueOnce({ output: 'working', exitCode: 0, duration: 100 })
      .mockResolvedValueOnce({
        output: '<tasks>COMPLETE</tasks>',
        exitCode: 0,
        duration: 100,
      })

    await run('test-prd', { agent: 'claude', iterations: '5' })

    expect(mockAgent.execute).toHaveBeenCalledTimes(2)
  })

  it('displays pending tasks count', async () => {
    await run('test-prd', { agent: 'claude', iterations: '1' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Pending tasks: 1/2')
    )
  })
})
