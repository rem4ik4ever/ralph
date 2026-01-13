import chalk from 'chalk'
import { getAgent, isValidAgent } from '../agents/index.js'
import { createSession, writeLog, getSessionDir } from '../session/index.js'
import { buildPrompt, COMPLETION_MARKER } from '../utils/index.js'

export interface RunOptions {
  agent: string
  iterations: string
}

export async function run(prompt: string[], opts: RunOptions): Promise<void> {
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

  // Build prompt with completion instructions
  let builtPrompt: string
  try {
    builtPrompt = await buildPrompt(prompt)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Failed to read prompt files: ${message}`))
    process.exit(1)
  }

  // Create session
  const sessionId = await createSession({
    promptFiles: prompt,
    agent: opts.agent,
    iterations,
  })

  console.log(chalk.blue(`Session: ${sessionId}`))
  console.log(chalk.gray(`Agent: ${agent.name}`))
  console.log(chalk.gray(`Iterations: ${iterations}`))
  console.log()

  // Run loop
  let completed = false
  let actualIterations = 0

  for (let i = 0; i < iterations; i++) {
    actualIterations++
    console.log(chalk.yellow(`[${i + 1}/${iterations}] Running ${agent.name}...`))
    console.log()

    const result = await agent.execute(builtPrompt, process.cwd(), {
      onOutput: (chunk) => process.stdout.write(chunk),
    })

    console.log()
    await writeLog(sessionId, i, result)

    if (result.exitCode !== 0) {
      console.log(chalk.red(`  Exit code: ${result.exitCode}`))
    } else {
      console.log(chalk.green(`  Done (${result.duration}ms)`))
    }

    // Check for completion marker
    if (result.output.includes(COMPLETION_MARKER)) {
      console.log(chalk.cyan(`  Agent signaled task complete`))
      completed = true
      break
    }
  }

  console.log()
  if (completed) {
    console.log(chalk.green(`Task completed after ${actualIterations} iteration(s)`))
  } else {
    console.log(chalk.yellow(`Reached max iterations (${iterations})`))
  }
  console.log(chalk.gray(`Logs: ${getSessionDir(sessionId)}`))
}
