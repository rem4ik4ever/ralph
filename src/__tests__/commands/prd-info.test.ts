import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prdInfo } from '../../commands/prd-info.js'
import * as prdManager from '../../prd/manager.js'
import type { PrdInfo } from '../../prd/types.js'

vi.mock('../../prd/manager.js', () => ({
  getPrdInfo: vi.fn(),
}))

describe('commands/prd-info', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>
  let mockProcessExit: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockProcessExit.mockRestore()
  })

  it('shows error and exits when PRD not found', async () => {
    const info: PrdInfo = {
      name: 'nonexistent',
      found: false,
      location: 'local',
      status: 'not_found',
      tasksCompleted: 0,
      tasksTotal: 0,
      files: {
        prdMd: { path: '/path/prd.md', exists: false },
        prdJson: { path: '/path/prd.json', exists: false },
        progress: { path: '/path/progress.txt', exists: false },
        iterations: { path: '/path/iterations', exists: false, fileCount: 0 },
      },
    }
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(info)

    await prdInfo('nonexistent')

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("PRD 'nonexistent' not found"))
    expect(mockProcessExit).toHaveBeenCalledWith(1)
  })

  it('displays PRD name and status', async () => {
    const info: PrdInfo = {
      name: 'my-prd',
      found: true,
      location: 'local',
      status: 'in_progress',
      tasksCompleted: 3,
      tasksTotal: 10,
      files: {
        prdMd: { path: '/project/.ralph/prd/my-prd/prd.md', exists: true },
        prdJson: { path: '/project/.ralph/prd/my-prd/prd.json', exists: true },
        progress: { path: '/project/.ralph/prd/my-prd/progress.txt', exists: true },
        iterations: { path: '/project/.ralph/prd/my-prd/iterations', exists: true, fileCount: 2 },
      },
    }
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(info)

    await prdInfo('my-prd')

    const calls = mockConsoleLog.mock.calls.map((c) => c[0]).filter((c) => typeof c === 'string')
    expect(calls.some((c) => c.includes('my-prd'))).toBe(true)
    expect(calls.some((c) => c.includes('in_progress'))).toBe(true)
    expect(calls.some((c) => c.includes('3/10'))).toBe(true)
  })

  it('displays file paths', async () => {
    const info: PrdInfo = {
      name: 'test-prd',
      found: true,
      location: 'local',
      status: 'pending',
      tasksCompleted: 0,
      tasksTotal: 5,
      files: {
        prdMd: { path: '/project/.ralph/prd/test-prd/prd.md', exists: true },
        prdJson: { path: '/project/.ralph/prd/test-prd/prd.json', exists: true },
        progress: { path: '/project/.ralph/prd/test-prd/progress.txt', exists: true },
        iterations: { path: '/project/.ralph/prd/test-prd/iterations', exists: false, fileCount: 0 },
      },
    }
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(info)

    await prdInfo('test-prd')

    const calls = mockConsoleLog.mock.calls.map((c) => c[0]).filter((c) => typeof c === 'string')
    expect(calls.some((c) => c.includes('prd.md'))).toBe(true)
    expect(calls.some((c) => c.includes('prd.json'))).toBe(true)
    expect(calls.some((c) => c.includes('progress'))).toBe(true)
    expect(calls.some((c) => c.includes('iterations'))).toBe(true)
  })

  it('shows partial status hint for unregistered PRDs', async () => {
    const info: PrdInfo = {
      name: 'partial-prd',
      found: true,
      location: 'local',
      status: 'partial',
      tasksCompleted: 0,
      tasksTotal: 0,
      files: {
        prdMd: { path: '/project/.ralph/prd/partial-prd/prd.md', exists: true },
        prdJson: { path: '/project/.ralph/prd/partial-prd/prd.json', exists: false },
        progress: { path: '/project/.ralph/prd/partial-prd/progress.txt', exists: false },
        iterations: { path: '/project/.ralph/prd/partial-prd/iterations', exists: false, fileCount: 0 },
      },
    }
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(info)

    await prdInfo('partial-prd')

    const calls = mockConsoleLog.mock.calls.map((c) => c[0]).filter((c) => typeof c === 'string')
    expect(calls.some((c) => c.includes('not registered'))).toBe(true)
    expect(calls.some((c) => c.includes('ralph prd add'))).toBe(true)
  })

  it('shows iteration file count', async () => {
    const info: PrdInfo = {
      name: 'with-iters',
      found: true,
      location: 'local',
      status: 'completed',
      tasksCompleted: 3,
      tasksTotal: 3,
      files: {
        prdMd: { path: '/path/prd.md', exists: true },
        prdJson: { path: '/path/prd.json', exists: true },
        progress: { path: '/path/progress.txt', exists: true },
        iterations: { path: '/path/iterations', exists: true, fileCount: 5 },
      },
    }
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(info)

    await prdInfo('with-iters')

    const calls = mockConsoleLog.mock.calls.map((c) => c[0]).filter((c) => typeof c === 'string')
    expect(calls.some((c) => c.includes('5 files'))).toBe(true)
  })
})
