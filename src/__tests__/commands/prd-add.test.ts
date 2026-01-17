import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prdAdd } from '../../commands/prd-add.js'
import * as agents from '../../agents/index.js'
import * as prdManager from '../../prd/manager.js'
import * as templates from '../../templates/templates.js'
import { access, writeFile, readFile } from 'node:fs/promises'

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}))

vi.mock('../../agents/index.js', () => ({
  getAgent: vi.fn(),
  isValidAgent: vi.fn(),
}))

vi.mock('../../prd/manager.js', () => ({
  prdExists: vi.fn(),
  createPrdFolder: vi.fn(),
  copyMarkdown: vi.fn(),
  getPrdDir: vi.fn(),
}))

vi.mock('../../templates/templates.js', () => ({
  ensureTemplates: vi.fn(),
  loadTemplate: vi.fn(),
  substituteVars: vi.fn(),
}))

describe('commands/prd-add', () => {
  const mockAgent = {
    name: 'claude',
    execute: vi.fn(),
  }

  let mockExit: ReturnType<typeof vi.spyOn>
  let mockConsoleLog: ReturnType<typeof vi.spyOn>
  let mockConsoleError: ReturnType<typeof vi.spyOn>
  let mockStdoutWrite: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(agents.isValidAgent).mockReturnValue(true)
    vi.mocked(agents.getAgent).mockReturnValue(mockAgent)
    vi.mocked(access).mockResolvedValue(undefined)
    vi.mocked(prdManager.prdExists).mockResolvedValue(false)
    vi.mocked(prdManager.getPrdDir).mockReturnValue('/home/test/.ralph/prd/test-prd')
    vi.mocked(prdManager.createPrdFolder).mockResolvedValue(undefined)
    vi.mocked(prdManager.copyMarkdown).mockResolvedValue(undefined)
    vi.mocked(templates.ensureTemplates).mockResolvedValue(undefined)
    vi.mocked(templates.loadTemplate).mockResolvedValue('template content')
    vi.mocked(templates.substituteVars).mockReturnValue('substituted prompt')
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ tasks: [{ id: 't1' }, { id: 't2' }] }))
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
    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    mockExit.mockRestore()
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockStdoutWrite.mockRestore()
  })

  it('validates agent type', async () => {
    vi.mocked(agents.isValidAgent).mockReturnValue(false)

    await expect(prdAdd('/path/to/prd.md', 'test-prd', { agent: 'invalid' }))
      .rejects.toThrow('process.exit called')

    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('validates markdown file exists', async () => {
    vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'))

    await expect(prdAdd('/missing/file.md', 'test-prd', { agent: 'claude' }))
      .rejects.toThrow('process.exit called')

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('File not found'))
  })

  it('checks if PRD already exists', async () => {
    vi.mocked(prdManager.prdExists).mockResolvedValue(true)

    await expect(prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' }))
      .rejects.toThrow('process.exit called')

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('already exists'))
  })

  it('creates PRD folder', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(prdManager.createPrdFolder).toHaveBeenCalledWith('test-prd')
  })

  it('copies markdown to prd.md', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(prdManager.copyMarkdown).toHaveBeenCalledWith('/path/to/prd.md', 'test-prd')
  })

  it('ensures templates exist', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(templates.ensureTemplates).toHaveBeenCalled()
  })

  it('loads prd-md-to-json template', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(templates.loadTemplate).toHaveBeenCalledWith('prd-md-to-json')
  })

  it('substitutes template variables', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(templates.substituteVars).toHaveBeenCalledWith('template content', {
      PRD_PATH: '/home/test/.ralph/prd/test-prd/prd.md',
      OUTPUT_PATH: '/home/test/.ralph/prd/test-prd/prd.json',
    })
  })

  it('calls agent with substituted prompt', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(mockAgent.execute).toHaveBeenCalledWith(
      'substituted prompt',
      expect.any(String),
      expect.objectContaining({ onOutput: expect.any(Function) })
    )
  })

  it('validates prd.json was created', async () => {
    vi.mocked(access)
      .mockResolvedValueOnce(undefined) // markdown file check
      .mockRejectedValueOnce(new Error('ENOENT')) // prd.json check

    await expect(prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' }))
      .rejects.toThrow('process.exit called')

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('did not create prd.json'))
  })

  it('creates empty progress.txt', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(writeFile).toHaveBeenCalledWith(
      '/home/test/.ralph/prd/test-prd/progress.txt',
      ''
    )
  })

  it('prints summary with task count', async () => {
    await prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' })

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Tasks: 2'))
  })

  it('handles agent failure', async () => {
    mockAgent.execute.mockResolvedValue({
      output: 'error',
      exitCode: 1,
      duration: 100,
    })

    await expect(prdAdd('/path/to/prd.md', 'test-prd', { agent: 'claude' }))
      .rejects.toThrow('process.exit called')

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Agent failed'))
  })
})
