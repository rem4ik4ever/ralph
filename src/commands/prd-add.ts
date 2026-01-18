import chalk from 'chalk'
import { confirm } from '@inquirer/prompts'
import { access, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAgent, isValidAgent } from '../agents/index.js'
import {
  createPrdFolder,
  copyMarkdown,
  getPrdDir,
  getPrdFileStatus,
  isProjectInitialized,
} from '../prd/index.js'
import { ensureTemplates, loadTemplate, substituteVars } from '../templates/index.js'

export interface PrdAddOptions {
  agent: string
}

export async function promptOverride(
  name: string,
  location: string,
): Promise<boolean> {
  try {
    return await confirm({
      message: `PRD '${name}' already exists (${location}). Override?`,
      default: false,
    })
  } catch {
    // Ctrl+C
    return false
  }
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

  // Check PRD file status in target location
  const isInitialized = await isProjectInitialized()
  const checkLocation = isInitialized ? 'local' : 'global'
  const fileStatus = await getPrdFileStatus(name, checkLocation)

  const prdDir = await getPrdDir(name, 'write')
  const prdJsonPath = join(prdDir, 'prd.json')
  const progressPath = join(prdDir, 'progress.txt')

  // Handle based on file status
  if (fileStatus === 'complete') {
    // Fully registered PRD exists - prompt for override
    const locationLabel = isInitialized ? 'local' : 'global'
    const shouldOverride = await promptOverride(name, locationLabel)
    if (!shouldOverride) {
      console.log(chalk.gray('PRD creation cancelled'))
      return
    }
  }

  console.log(chalk.blue(`Creating PRD: ${name}`))

  // Create folder and copy markdown (skip copy if partial - md already exists)
  await createPrdFolder(name)
  if (fileStatus !== 'partial') {
    await copyMarkdown(path, name)
    console.log(chalk.gray(`  Copied ${path} → prd.md`))
  } else {
    console.log(chalk.gray(`  Using existing prd.md`))
  }

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
