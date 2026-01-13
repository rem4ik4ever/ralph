import chalk from 'chalk'
import { getAgent, isValidAgent } from '../agents/index.js'
import { createSession, writeLog, getSessionDir } from '../session/index.js'
import { buildPrompt } from '../utils/index.js'

export interface RunOptions {
  task: string
  agent: string
  iterations: string
  context?: string[]
}

export async function run(opts: RunOptions): Promise<void> {
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

  const agent = getAgent(opts.agent)

  // Build prompt
  let prompt: string
  try {
    prompt = await buildPrompt(opts.task, opts.context)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Failed to read context files: ${message}`))
    process.exit(1)
  }

  // Create session
  const sessionId = await createSession({
    task: opts.task,
    agent: opts.agent,
    iterations,
    contextFiles: opts.context,
  })

  console.log(chalk.blue(`Session: ${sessionId}`))
  console.log(chalk.gray(`Agent: ${agent.name}`))
  console.log(chalk.gray(`Iterations: ${iterations}`))
  console.log()

  // Run loop
  for (let i = 0; i < iterations; i++) {
    console.log(chalk.yellow(`[${i + 1}/${iterations}] Running ${agent.name}...`))

    const result = await agent.execute(prompt, process.cwd())
    await writeLog(sessionId, i, result)

    if (result.exitCode !== 0) {
      console.log(chalk.red(`  Exit code: ${result.exitCode}`))
    } else {
      console.log(chalk.green(`  Done (${result.duration}ms)`))
    }
  }

  console.log()
  console.log(chalk.green(`Completed ${iterations} iterations`))
  console.log(chalk.gray(`Logs: ${getSessionDir(sessionId)}`))
}
