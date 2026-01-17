import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prdList } from '../../commands/prd-list.js'
import * as prdManager from '../../prd/manager.js'

vi.mock('../../prd/manager.js', () => ({
  listPrds: vi.fn(),
}))

describe('commands/prd-list', () => {
  let mockConsoleLog: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
  })

  it('shows message when no PRDs found', async () => {
    vi.mocked(prdManager.listPrds).mockResolvedValue([])

    await prdList()

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No PRDs found'))
  })

  it('displays PRD table with headers', async () => {
    vi.mocked(prdManager.listPrds).mockResolvedValue([
      {
        name: 'test-prd',
        description: 'Test description',
        status: 'pending',
        tasksTotal: 5,
        tasksCompleted: 0,
        location: 'global',
      },
    ])

    await prdList()

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('NAME'))
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('DESCRIPTION'))
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('STATUS'))
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('PROGRESS'))
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('LOCATION'))
  })

  it('displays PRD data in rows', async () => {
    vi.mocked(prdManager.listPrds).mockResolvedValue([
      {
        name: 'my-prd',
        description: 'My PRD description',
        status: 'in_progress',
        tasksTotal: 10,
        tasksCompleted: 3,
        location: 'local',
      },
    ])

    await prdList()

    const calls = mockConsoleLog.mock.calls.map((c) => c[0])
    const dataRow = calls[1]

    expect(dataRow).toContain('my-prd')
    expect(dataRow).toContain('My PRD description')
    expect(dataRow).toContain('3/10')
    expect(dataRow).toContain('local')
  })

  it('handles multiple PRDs', async () => {
    vi.mocked(prdManager.listPrds).mockResolvedValue([
      {
        name: 'prd-one',
        description: 'First',
        status: 'completed',
        tasksTotal: 3,
        tasksCompleted: 3,
        location: 'local',
      },
      {
        name: 'prd-two',
        description: 'Second',
        status: 'pending',
        tasksTotal: 5,
        tasksCompleted: 0,
        location: 'global',
      },
    ])

    await prdList()

    // Header + 2 data rows
    expect(mockConsoleLog).toHaveBeenCalledTimes(3)
  })

  it('truncates long descriptions', async () => {
    const longDesc = 'A'.repeat(50)
    vi.mocked(prdManager.listPrds).mockResolvedValue([
      {
        name: 'test',
        description: longDesc,
        status: 'pending',
        tasksTotal: 1,
        tasksCompleted: 0,
        location: 'global',
      },
    ])

    await prdList()

    const calls = mockConsoleLog.mock.calls.map((c) => c[0])
    const dataRow = calls[1]

    expect(dataRow).toContain('...')
    expect(dataRow).not.toContain(longDesc)
  })
})
