import chalk from 'chalk'
import { select, confirm } from '@inquirer/prompts'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentType, InitConfig } from '../prd/types.js'
import {
  getClaudeDir,
  getTargetSkillDir,
  getTargetSkillPath,
  getTargetRalphSkillDir,
  getTargetRalphSkillPath,
  getTargetCommandPath,
  loadBundledSkill,
  loadBundledCommand,
  loadBundledRalphSkill,
  BundledTemplateNotFoundError,
} from '../init/index.js'

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

export async function installClaudeSkills(): Promise<void> {
  const claudeDir = getClaudeDir()
  const skillsDir = join(claudeDir, 'skills')
  const commandsDir = join(claudeDir, 'commands')

  // Create directories if they don't exist
  try {
    await mkdir(skillsDir, { recursive: true })
    await mkdir(commandsDir, { recursive: true })
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    console.error(chalk.red(`Failed to create Claude directories: ${error.message}`))
    throw err
  }

  // Load bundled templates
  let skillContent: string
  let commandContent: string
  let ralphSkillContent: string
  try {
    skillContent = await loadBundledSkill()
    commandContent = await loadBundledCommand()
    ralphSkillContent = await loadBundledRalphSkill()
  } catch (err) {
    if (err instanceof BundledTemplateNotFoundError) {
      console.error(chalk.red('Failed to load bundled templates'))
      console.error(chalk.gray('This may indicate a corrupted installation. Try reinstalling ralph.'))
    }
    throw err
  }

  // Write ralph-prd skill
  const targetSkillDir = getTargetSkillDir()
  const targetSkillPath = getTargetSkillPath()

  try {
    await mkdir(targetSkillDir, { recursive: true })
    await writeFile(targetSkillPath, skillContent)
    console.log(chalk.green(`✓ Installed skill: ${targetSkillPath}`))
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EACCES') {
      console.error(chalk.red(`Permission denied: Cannot write ${targetSkillPath}`))
    } else {
      console.error(chalk.red(`Failed to install skill: ${error.message}`))
    }
    throw err
  }

  // Write ralph skill (CLI documentation)
  const targetRalphSkillDir = getTargetRalphSkillDir()
  const targetRalphSkillPath = getTargetRalphSkillPath()

  try {
    await mkdir(targetRalphSkillDir, { recursive: true })
    await writeFile(targetRalphSkillPath, ralphSkillContent)
    console.log(chalk.green(`✓ Installed skill: ${targetRalphSkillPath}`))
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EACCES') {
      console.error(chalk.red(`Permission denied: Cannot write ${targetRalphSkillPath}`))
    } else {
      console.error(chalk.red(`Failed to install skill: ${error.message}`))
    }
    throw err
  }

  // Write command
  const targetCommandPath = getTargetCommandPath()

  try {
    await writeFile(targetCommandPath, commandContent)
    console.log(chalk.green(`✓ Installed command: ${targetCommandPath}`))
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === 'EACCES') {
      console.error(chalk.red(`Permission denied: Cannot write ${targetCommandPath}`))
    } else {
      console.error(chalk.red(`Failed to install command: ${error.message}`))
    }
    throw err
  }
}

export async function init(): Promise<void> {
  // Check for existing initialization
  if (await ralphDirExists()) {
    const overwrite = await promptOverwrite()
    if (overwrite === null) {
      // Ctrl+C
      return
    }
    if (!overwrite) {
      console.log(chalk.gray('Initialization cancelled'))
      return
    }
  }

  // Run prompts
  const result = await runInitPrompts()
  if (result.aborted) {
    return
  }

  // Create project directories
  await createProjectDirs()

  // Install skills if requested
  if (result.installSkills) {
    await installClaudeSkills()
  }

  // Write config
  await writeConfig(result.agent)

  // Success message
  console.log()
  console.log(chalk.cyan('Next steps:'))
  if (result.agent === 'claude' && result.installSkills) {
    console.log(chalk.gray('  1. Create a PRD: /ralph-prd <feature-name>'))
    console.log(chalk.gray('  2. Run tasks: /ralph-complete-next-task <prd-name>'))
  } else {
    console.log(chalk.gray('  1. Create PRDs in .ralph/prd/'))
    console.log(chalk.gray('  2. Run: ralph run <prd-name>'))
  }
}
