import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prdDelete } from '../../commands/prd-delete.js'
import * as prdManager from '../../prd/manager.js'
import { confirm } from '@inquirer/prompts'
import { rm } from 'node:fs/promises'
import type { PrdInfo } from '../../prd/types.js'

vi.mock('../../prd/manager.js', () => ({
  getPrdInfo: vi.fn(),
}))

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  rm: vi.fn(),
}))

describe('commands/prd-delete', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>
  let mockProcessExit: ReturnType<typeof vi.spyOn>

  const createMockInfo = (overrides: Partial<PrdInfo> = {}): PrdInfo => ({
    name: 'test-prd',
    found: true,
    location: 'local',
    status: 'in_progress',
    tasksCompleted: 1,
    tasksTotal: 3,
    files: {
      prdMd: { path: '/project/.ralph/prd/test-prd/prd.md', exists: true },
      prdJson: { path: '/project/.ralph/prd/test-prd/prd.json', exists: true },
      progress: { path: '/project/.ralph/prd/test-prd/progress.txt', exists: true },
      iterations: { path: '/project/.ralph/prd/test-prd/iterations', exists: true, fileCount: 2 },
    },
    ...overrides,
  })

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
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(
      createMockInfo({ found: false, status: 'not_found' })
    )

    await prdDelete('nonexistent', {})

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("PRD 'nonexistent' not found"))
    expect(mockProcessExit).toHaveBeenCalledWith(1)
    expect(rm).not.toHaveBeenCalled()
  })

  it('prompts for confirmation by default', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(confirm).mockResolvedValue(true)
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('test-prd', {})

    expect(confirm).toHaveBeenCalled()
    expect(rm).toHaveBeenCalled()
  })

  it('cancels when user declines confirmation', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(confirm).mockResolvedValue(false)

    await prdDelete('test-prd', {})

    expect(confirm).toHaveBeenCalled()
    expect(rm).not.toHaveBeenCalled()
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
  })

  it('skips confirmation with --force flag', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('test-prd', { force: true })

    expect(confirm).not.toHaveBeenCalled()
    expect(rm).toHaveBeenCalled()
  })

  it('deletes PRD directory recursively', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('test-prd', { force: true })

    expect(rm).toHaveBeenCalledWith('/project/.ralph/prd/test-prd', { recursive: true, force: true })
  })

  it('shows success message after deletion', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('test-prd', { force: true })

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Deleted PRD 'test-prd'"))
  })

  it('lists files to be deleted before confirmation', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(confirm).mockResolvedValue(true)
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('test-prd', {})

    const calls = mockConsoleLog.mock.calls.map((c) => c[0]).filter((c) => typeof c === 'string')
    expect(calls.some((c) => c.includes('prd.md'))).toBe(true)
    expect(calls.some((c) => c.includes('prd.json'))).toBe(true)
    expect(calls.some((c) => c.includes('progress.txt'))).toBe(true)
    expect(calls.some((c) => c.includes('iterations'))).toBe(true)
  })

  it('handles Ctrl+C during confirmation', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(confirm).mockRejectedValue(new Error('User cancelled'))

    await prdDelete('test-prd', {})

    expect(rm).not.toHaveBeenCalled()
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
  })

  it('throws when rm fails with permission error', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(createMockInfo())
    vi.mocked(rm).mockRejectedValue(new Error('EACCES: permission denied'))

    await expect(prdDelete('test-prd', { force: true })).rejects.toThrow('EACCES')
  })

  it('handles PRD with no existing files', async () => {
    vi.mocked(prdManager.getPrdInfo).mockResolvedValue(
      createMockInfo({
        files: {
          prdMd: { path: '/project/.ralph/prd/empty/prd.md', exists: false },
          prdJson: { path: '/project/.ralph/prd/empty/prd.json', exists: false },
          progress: { path: '/project/.ralph/prd/empty/progress.txt', exists: false },
          iterations: { path: '/project/.ralph/prd/empty/iterations', exists: false, fileCount: 0 },
        },
      })
    )
    vi.mocked(rm).mockResolvedValue(undefined)

    await prdDelete('empty', { force: true })

    // Should still attempt to delete the directory
    expect(rm).toHaveBeenCalledWith('/project/.ralph/prd/empty', { recursive: true, force: true })
  })
})
