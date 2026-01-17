import chalk from 'chalk'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAgent, isValidAgent } from '../agents/index.js'
import { getPrd, getPrdDir, prdExists } from '../prd/index.js'
import { ensureTemplates, loadTemplate, substituteVars } from '../templates/index.js'

const TASKS_COMPLETE_MARKER = '<tasks>COMPLETE</tasks>'

export interface RunOptions {
  agent: string
  iterations: string
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
  const prdDir = getPrdDir(prdName)
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

  // Run loop
  let completed = false
  let actualIterations = 0

  for (let i = 0; i < iterations; i++) {
    actualIterations++
    console.log(chalk.yellow(`[${i + 1}/${iterations}] Running ${agent.name}...`))
    console.log()

    const result = await agent.execute(prompt, process.cwd(), {
      onOutput: (chunk) => process.stdout.write(chunk),
    })

    console.log()
    await writeIterationLog(iterationsDir, i, result)

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

  console.log()
  if (completed) {
    console.log(chalk.green(`PRD completed after ${actualIterations} iteration(s)`))
  } else {
    console.log(chalk.yellow(`Reached max iterations (${iterations})`))
  }
  console.log(chalk.gray(`Logs: ${iterationsDir}`))
}

interface IterationResult {
  output: string
  exitCode: number
  duration: number
}

async function writeIterationLog(
  iterationsDir: string,
  iteration: number,
  result: IterationResult
): Promise<void> {
  const logPath = join(iterationsDir, `${iteration}.log`)

  const header = [
    `# Iteration ${iteration}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Duration: ${result.duration}ms`,
    `Exit Code: ${result.exitCode}`,
    '---',
    '',
  ].join('\n')

  await writeFile(logPath, header + result.output)
}
