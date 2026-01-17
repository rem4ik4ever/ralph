import chalk from 'chalk'
import { select, confirm } from '@inquirer/prompts'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentType, InitConfig } from '../prd/types.js'

export interface InitOptions {
  agent?: AgentType
  installSkills?: boolean
}

export interface InitResult {
  agent: AgentType
  installSkills: boolean
  aborted: boolean
}

export async function promptAgentSelection(): Promise<AgentType | null> {
  try {
    return await select<AgentType>({
      message: 'Which agent are you using?',
      choices: [
        { value: 'claude', name: 'claude' },
        { value: 'codex', name: 'codex' },
        { value: 'opencode', name: 'opencode' },
      ],
    })
  } catch {
    // Ctrl+C
    return null
  }
}

export async function promptSkillInstallation(): Promise<boolean | null> {
  try {
    return await confirm({
      message: 'Install ralph-prd skill and ralph-complete-next-task command?',
      default: true,
    })
  } catch {
    // Ctrl+C
    return null
  }
}

export async function promptOverwrite(): Promise<boolean | null> {
  try {
    return await confirm({
      message: 'Project already initialized. Overwrite?',
      default: false,
    })
  } catch {
    // Ctrl+C
    return null
  }
}

export async function runInitPrompts(): Promise<InitResult> {
  const agent = await promptAgentSelection()
  if (agent === null) {
    return { agent: 'claude', installSkills: false, aborted: true }
  }

  let installSkills = false

  if (agent === 'claude') {
    const shouldInstall = await promptSkillInstallation()
    if (shouldInstall === null) {
      return { agent, installSkills: false, aborted: true }
    }
    installSkills = shouldInstall
  } else {
    console.log(chalk.yellow(`Skill installation not yet supported for ${agent}`))
  }

  return { agent, installSkills, aborted: false }
}

export function getRalphDir(): string {
  return join(process.cwd(), '.ralph')
}

export function getRalphPrdDir(): string {
  return join(getRalphDir(), 'prd')
}

export function getConfigPath(): string {
  return join(getRalphDir(), 'config.json')
}

export async function ralphDirExists(): Promise<boolean> {
  try {
    await access(getRalphDir())
    return true
  } catch {
    return false
  }
}

export async function createProjectDirs(): Promise<void> {
  const ralphDir = getRalphDir()
  const prdDir = getRalphPrdDir()

  try {
    await mkdir(ralphDir, { recursive: true })
    console.log(chalk.green(`✓ Created ${ralphDir}`))

    await mkdir(prdDir, { recursive: true })
    console.log(chalk.green(`✓ Created ${prdDir}`))
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EACCES') {
      console.error(chalk.red(`Permission denied: Cannot create ${ralphDir}`))
      console.error(chalk.gray('Check directory permissions and try again'))
    } else {
      console.error(chalk.red(`Failed to create directories: ${error.message}`))
    }
    throw err
  }
}

export async function writeConfig(agent: AgentType): Promise<void> {
  const configPath = getConfigPath()
  const config: InitConfig = {
    agent,
    initialized: new Date().toISOString(),
  }

  try {
    await writeFile(configPath, JSON.stringify(config, null, 2))
    console.log(chalk.green(`✓ Saved config: ${configPath}`))
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EACCES') {
      console.error(chalk.red(`Permission denied: Cannot write ${configPath}`))
    } else {
      console.error(chalk.red(`Failed to write config: ${error.message}`))
    }
    throw err
  }
}
