import chalk from 'chalk'
import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAgent, isValidAgent } from '../agents/index.js'
import { createPrdFolder, copyMarkdown, getPrdDir, prdExists } from '../prd/index.js'
import { ensureTemplates, loadTemplate, substituteVars } from '../templates/index.js'

export interface PrdAddOptions {
  agent: string
}

export async function prdAdd(
  path: string,
  name: string,
  opts: PrdAddOptions
): Promise<void> {
  // Validate agent
  if (!isValidAgent(opts.agent)) {
    console.error(chalk.red(`Unknown agent: ${opts.agent}`))
    console.error(`Supported agents: claude`)
    process.exit(1)
  }

  // Validate markdown file exists
  try {
    await access(path)
  } catch {
    console.error(chalk.red(`File not found: ${path}`))
    process.exit(1)
  }

  // Check if PRD already exists
  if (await prdExists(name)) {
    console.error(chalk.red(`PRD already exists: ${name}`))
    process.exit(1)
  }

  const prdDir = getPrdDir(name)
  const prdJsonPath = join(prdDir, 'prd.json')
  const progressPath = join(prdDir, 'progress.txt')

  console.log(chalk.blue(`Creating PRD: ${name}`))

  // Create folder and copy markdown
  await createPrdFolder(name)
  await copyMarkdown(path, name)
  console.log(chalk.gray(`  Copied ${path} → prd.md`))

  // Ensure templates and load prd-md-to-json
  await ensureTemplates()
  const template = await loadTemplate('prd-md-to-json')
  const prompt = substituteVars(template, {
    PRD_PATH: join(prdDir, 'prd.md'),
    OUTPUT_PATH: prdJsonPath,
  })

  // Run agent to convert markdown to JSON
  console.log(chalk.yellow(`  Running ${opts.agent} to convert PRD...`))
  const agent = getAgent(opts.agent)
  const result = await agent.execute(prompt, process.cwd(), {
    onOutput: (chunk) => process.stdout.write(chunk),
  })

  console.log()

  if (result.exitCode !== 0) {
    console.error(chalk.red(`Agent failed with exit code ${result.exitCode}`))
    process.exit(1)
  }

  // Validate prd.json was created
  try {
    await access(prdJsonPath)
  } catch {
    console.error(chalk.red(`Agent did not create prd.json`))
    process.exit(1)
  }

  // Create empty progress.txt
  await writeFile(progressPath, '')

  // Read task count for summary
  const { readFile } = await import('node:fs/promises')
  const prdContent = await readFile(prdJsonPath, 'utf-8')
  const prd = JSON.parse(prdContent)
  const taskCount = prd.tasks?.length ?? 0

  console.log(chalk.green(`PRD created: ${name}`))
  console.log(chalk.gray(`  Tasks: ${taskCount}`))
  console.log(chalk.gray(`  Location: ${prdDir}`))
}
