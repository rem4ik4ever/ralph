import chalk from 'chalk'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getAgent, isValidAgent } from '../agents/index.js'
import { getPrd, getPrdDir, prdExists } from '../prd/index.js'
import { StreamPersisterImpl } from '../stream/persister.js'
import type { StreamPersister } from '../stream/types.js'
import { ensureTemplates, loadTemplate, substituteVars } from '../templates/index.js'

const TASKS_COMPLETE_MARKER = '<tasks>COMPLETE</tasks>'

export interface RunOptions {
  agent: string
  iterations: string
}

type SignalType = 'SIGINT' | 'SIGTERM' | 'SIGHUP'

/**
 * Signal handler manager for graceful interruption
 */
class SignalHandlers {
  private activePersister: StreamPersister | null = null
  private handlers = new Map<SignalType | 'uncaughtException', (...args: unknown[]) => void>()
  private aborted = false

  register(): void {
    const signals: SignalType[] = ['SIGINT', 'SIGTERM', 'SIGHUP']

    for (const signal of signals) {
      const handler = () => void this.handleSignal(signal)
      this.handlers.set(signal, handler)
      process.addListener(signal, handler)
    }

    const exceptionHandler = (err: unknown) =>
      void this.handleCrash(err instanceof Error ? err : new Error(String(err)))
    this.handlers.set('uncaughtException', exceptionHandler)
    process.addListener('uncaughtException', exceptionHandler as NodeJS.UncaughtExceptionListener)
  }

  unregister(): void {
    const signals: SignalType[] = ['SIGINT', 'SIGTERM', 'SIGHUP']
    for (const signal of signals) {
      const handler = this.handlers.get(signal)
      if (handler) process.removeListener(signal, handler)
    }

    const exceptionHandler = this.handlers.get('uncaughtException')
    if (exceptionHandler) process.removeListener('uncaughtException', exceptionHandler)

    this.handlers.clear()
  }

  setPersister(persister: StreamPersister | null): void {
    this.activePersister = persister
  }

  wasAborted(): boolean {
    return this.aborted
  }

  private async handleSignal(signal: SignalType): Promise<void> {
    this.aborted = true
    if (this.activePersister) {
      await this.activePersister.abort(signal)
      this.activePersister = null
    }
    this.unregister()
    process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1))
  }

  private async handleCrash(error: Error): Promise<void> {
    if (this.activePersister) {
      await this.activePersister.crash(error)
      this.activePersister = null
    }
    this.unregister()
    console.error(chalk.red(`Uncaught exception: ${error.message}`))
    process.exit(1)
  }
}

export async function run(prdName: string, opts: RunOptions): Promise<void> {
  // Validate agent
  if (!isValidAgent(opts.agent)) {
    console.error(chalk.red(`Unknown agent: ${opts.agent}`))
    console.error(`Supported agents: claude`)
    process.exit(1)
  }

  // Validate iterations
  const iterations = parseInt(opts.iterations, 10)
  if (isNaN(iterations) || iterations <= 0) {
    console.error(chalk.red(`Iterations must be a positive number, got: ${opts.iterations}`))
    process.exit(1)
  }

  // Validate PRD exists
  if (!(await prdExists(prdName))) {
    console.error(chalk.red(`PRD not found: ${prdName}`))
    process.exit(1)
  }

  const prd = await getPrd(prdName)
  const prdDir = await getPrdDir(prdName)
  const prdJsonPath = join(prdDir, 'prd.json')
  const iterationsDir = join(prdDir, 'iterations')

  // Create iterations directory
  await mkdir(iterationsDir, { recursive: true })

  // Load and substitute template
  await ensureTemplates()
  const template = await loadTemplate('complete-next-task')
  const prdMdPath = join(prdDir, 'prd.md')
  const prompt = substituteVars(template, {
    PRD_NAME: prdName,
    PRD_PATH: prdJsonPath,
    PRD_MD_PATH: prdMdPath,
    CWD: process.cwd(),
  })

  const agent = getAgent(opts.agent)
  const pendingTasks = prd.tasks.filter((t) => !t.passes).length

  console.log(chalk.blue(`PRD: ${prdName}`))
  console.log(chalk.gray(`Agent: ${agent.name}`))
  console.log(chalk.gray(`Pending tasks: ${pendingTasks}/${prd.tasks.length}`))
  console.log(chalk.gray(`Iterations: ${iterations}`))
  console.log()

  // Set up signal handlers for graceful interruption
  const signalHandlers = new SignalHandlers()
  signalHandlers.register()

  // Run loop
  let completed = false
  let actualIterations = 0

  try {
    for (let i = 0; i < iterations; i++) {
      actualIterations++
      console.log(chalk.yellow(`[${i + 1}/${iterations}] Running ${agent.name}...`))
      console.log()

      const logPath = join(iterationsDir, `${i}.log`)
      const persister = new StreamPersisterImpl({ logPath })
      signalHandlers.setPersister(persister)

      const result = await agent.execute(prompt, process.cwd(), {
        onOutput: (chunk) => process.stdout.write(chunk),
        onPersist: (chunk, isEventBoundary) => {
          void persister.append(chunk, isEventBoundary)
        },
        onStderr: (chunk) => {
          void persister.appendStderr(chunk)
        },
      })

      signalHandlers.setPersister(null)
      await persister.complete(result.exitCode, result.duration)
      console.log()

      if (result.exitCode !== 0) {
        console.log(chalk.red(`  Exit code: ${result.exitCode}`))
      } else {
        console.log(chalk.green(`  Done (${result.duration}ms)`))
      }

      // Check for completion marker
      if (result.output.includes(TASKS_COMPLETE_MARKER)) {
        console.log(chalk.cyan(`  All tasks complete`))
        completed = true
        break
      }
    }
  } finally {
    signalHandlers.unregister()
  }

  console.log()
  if (completed) {
    console.log(chalk.green(`PRD completed after ${actualIterations} iteration(s)`))
  } else {
    console.log(chalk.yellow(`Reached max iterations (${iterations})`))
  }
  console.log(chalk.gray(`Logs: ${iterationsDir}`))
}
