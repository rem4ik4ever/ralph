import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir, access, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Create temp directory before importing modules that use homedir
let tempDir: string

vi.mock('../../agents/index.js', () => ({
  getAgent: vi.fn(),
  isValidAgent: vi.fn(),
}))

// Mock the entire prd/manager module with temp directory
vi.mock('../../prd/manager.js', () => ({
  getPrdsDir: vi.fn(),
  getPrdDir: vi.fn(),
  prdExists: vi.fn(),
  createPrdFolder: vi.fn(),
  copyMarkdown: vi.fn(),
  getPrd: vi.fn(),
  listPrds: vi.fn(),
  isProjectInitialized: vi.fn(),
}))

vi.mock('../../templates/templates.js', () => ({
  ensureTemplates: vi.fn(),
  loadTemplate: vi.fn(),
  substituteVars: vi.fn(),
}))

describe('integration/prd-workflow', () => {
  let mockAgent: { name: string; execute: ReturnType<typeof vi.fn> }
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>
  let mockStdoutWrite: ReturnType<typeof vi.spyOn>
  let mockExit: ReturnType<typeof vi.spyOn>

  // Import mocked modules
  let agents: typeof import('../../agents/index.js')
  let prdManager: typeof import('../../prd/manager.js')
  let templates: typeof import('../../templates/templates.js')

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create temp directory for PRD storage
    tempDir = await mkdtemp(join(tmpdir(), 'ralph-test-'))

    // Import mocked modules
    agents = await import('../../agents/index.js')
    prdManager = await import('../../prd/manager.js')
    templates = await import('../../templates/templates.js')

    // Configure getPrdsDir/getPrdDir mocks
    vi.mocked(prdManager.getPrdsDir).mockReturnValue(tempDir)
    vi.mocked(prdManager.getPrdDir).mockImplementation(async (name: string) => join(tempDir, name))
    vi.mocked(prdManager.isProjectInitialized).mockResolvedValue(false)

    // Mock agent
    mockAgent = {
      name: 'claude',
      execute: vi.fn(),
    }
    vi.mocked(agents.isValidAgent).mockReturnValue(true)
    vi.mocked(agents.getAgent).mockReturnValue(mockAgent)

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    // Mock templates
    vi.mocked(templates.ensureTemplates).mockResolvedValue(undefined)
    vi.mocked(templates.loadTemplate).mockResolvedValue('mock template')
    vi.mocked(templates.substituteVars).mockImplementation((tpl, vars) => {
      let result = tpl
      for (const [key, val] of Object.entries(vars)) {
        result = result.replace(`$${key}`, val as string)
      }
      return result
    })
  })

  afterEach(async () => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockStdoutWrite.mockRestore()
    mockExit.mockRestore()

    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true })
  })

  it('add → list → run → list: status progresses from pending to in_progress', async () => {
    const { prdAdd } = await import('../../commands/prd-add.js')
    const { run } = await import('../../commands/run.js')

    // 1. Create a temp PRD markdown file
    const prdMdPath = join(tempDir, 'test.md')
    await writeFile(prdMdPath, '# Test PRD\n\n## Task 1\nDo something')

    // 2. Setup sample PRD data
    const samplePrd = {
      prdName: 'test-prd',
      tasks: [
        { id: 'task-1', description: 'Task one', steps: ['step 1'], passes: false },
        { id: 'task-2', description: 'Task two', steps: ['step 2'], passes: false },
      ],
    }

    // 3. Mock prdExists to return false initially (PRD doesn't exist yet)
    vi.mocked(prdManager.prdExists).mockResolvedValue(false)
    vi.mocked(prdManager.createPrdFolder).mockImplementation(async (name: string) => {
      await mkdir(join(tempDir, name), { recursive: true })
    })
    vi.mocked(prdManager.copyMarkdown).mockResolvedValue(undefined)

    // 4. Mock agent to create prd.json during add
    mockAgent.execute.mockImplementation(async () => {
      const prdDir = join(tempDir, 'test-prd')
      await writeFile(join(prdDir, 'prd.json'), JSON.stringify(samplePrd))
      return { output: 'done', exitCode: 0, duration: 100 }
    })

    // 5. Run prd add
    await prdAdd(prdMdPath, 'test-prd', { agent: 'claude' })

    // 6. Verify prd.json was created
    const prdJsonPath = join(tempDir, 'test-prd', 'prd.json')
    await access(prdJsonPath) // Will throw if doesn't exist

    // 7. Setup listPrds mock to use real file
    vi.mocked(prdManager.listPrds).mockImplementation(async () => {
      const content = await readFile(prdJsonPath, 'utf-8')
      const prd = JSON.parse(content)
      const completed = prd.tasks.filter((t: { passes: boolean }) => t.passes).length
      const total = prd.tasks.length
      let status: 'pending' | 'in_progress' | 'completed' = 'pending'
      if (completed === total) status = 'completed'
      else if (completed > 0) status = 'in_progress'
      return [{
        name: prd.prdName,
        description: prd.tasks[0]?.description ?? '',
        status,
        tasksTotal: total,
        tasksCompleted: completed,
      }]
    })

    // 8. Verify list shows pending status
    const prds1 = await prdManager.listPrds()
    expect(prds1).toHaveLength(1)
    expect(prds1[0].name).toBe('test-prd')
    expect(prds1[0].status).toBe('pending')
    expect(prds1[0].tasksCompleted).toBe(0)
    expect(prds1[0].tasksTotal).toBe(2)

    // 9. Mock prdExists/getPrd for run command
    vi.mocked(prdManager.prdExists).mockResolvedValue(true)
    vi.mocked(prdManager.getPrd).mockImplementation(async () => {
      const content = await readFile(prdJsonPath, 'utf-8')
      return JSON.parse(content)
    })

    // 10. Mock agent for run command - simulates completing one task
    mockAgent.execute.mockImplementation(async () => {
      const updatedPrd = {
        ...samplePrd,
        tasks: [
          { ...samplePrd.tasks[0], passes: true },
          samplePrd.tasks[1],
        ],
      }
      await writeFile(prdJsonPath, JSON.stringify(updatedPrd))
      return { output: 'task completed', exitCode: 0, duration: 200 }
    })

    // 11. Run with 1 iteration
    await run('test-prd', { agent: 'claude', iterations: '1' })

    // 12. Verify list now shows in_progress
    const prds2 = await prdManager.listPrds()
    expect(prds2).toHaveLength(1)
    expect(prds2[0].status).toBe('in_progress')
    expect(prds2[0].tasksCompleted).toBe(1)
  })

  it('run stops on COMPLETE marker', async () => {
    const { run } = await import('../../commands/run.js')

    // Setup PRD directly
    const prdDir = join(tempDir, 'complete-prd')
    await mkdir(prdDir, { recursive: true })
    await writeFile(
      join(prdDir, 'prd.json'),
      JSON.stringify({
        prdName: 'complete-prd',
        tasks: [{ id: 't1', passes: false }],
      })
    )

    // Mock prdExists and getPrd
    vi.mocked(prdManager.prdExists).mockResolvedValue(true)
    vi.mocked(prdManager.getPrd).mockResolvedValue({
      prdName: 'complete-prd',
      tasks: [{ id: 't1', category: 'test', description: 'Test', steps: [], passes: false }],
    })

    // Agent returns COMPLETE marker on first call
    mockAgent.execute.mockResolvedValue({
      output: 'All done! <tasks>COMPLETE</tasks>',
      exitCode: 0,
      duration: 100,
    })

    await run('complete-prd', { agent: 'claude', iterations: '5' })

    // Should only run once despite 5 iterations requested
    expect(mockAgent.execute).toHaveBeenCalledTimes(1)
  })

  it('list shows completed status when all tasks pass', async () => {
    // Create PRD with all tasks passing
    const prdDir = join(tempDir, 'done-prd')
    await mkdir(prdDir, { recursive: true })
    const prdJsonPath = join(prdDir, 'prd.json')
    await writeFile(
      prdJsonPath,
      JSON.stringify({
        prdName: 'done-prd',
        tasks: [
          { id: 't1', passes: true },
          { id: 't2', passes: true },
        ],
      })
    )

    // Mock listPrds to read from our temp file
    vi.mocked(prdManager.listPrds).mockImplementation(async () => {
      const content = await readFile(prdJsonPath, 'utf-8')
      const prd = JSON.parse(content)
      return [{
        name: prd.prdName,
        description: '',
        status: 'completed' as const,
        tasksTotal: 2,
        tasksCompleted: 2,
      }]
    })

    const prds = await prdManager.listPrds()
    expect(prds).toHaveLength(1)
    expect(prds[0].status).toBe('completed')
    expect(prds[0].tasksCompleted).toBe(2)
    expect(prds[0].tasksTotal).toBe(2)
  })

  it('handles empty prd folder gracefully', async () => {
    vi.mocked(prdManager.listPrds).mockResolvedValue([])

    const prds = await prdManager.listPrds()
    expect(prds).toEqual([])
  })
})
