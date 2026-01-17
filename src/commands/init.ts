import chalk from 'chalk'
import { select, confirm } from '@inquirer/prompts'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { AgentType, InitConfig } from '../prd/types.js'
import {
  getClaudeDir,
  getSourceSkillPath,
  getSourceCommandPath,
  getTargetSkillDir,
  getTargetSkillPath,
  getTargetCommandPath,
  readSourceSkill,
  readSourceCommand,
  transformSkillContent,
  transformCommandContent,
  SourceFileNotFoundError,
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

  // Read and transform skill
  let skillContent: string
  try {
    skillContent = await readSourceSkill()
  } catch (err) {
    if (err instanceof SourceFileNotFoundError) {
      console.error(chalk.red(`Source skill not found: ${getSourceSkillPath()}`))
      console.error(chalk.gray('Install the prd skill globally first:'))
      console.error(chalk.gray('  mkdir -p ~/.claude/skills/prd'))
      console.error(chalk.gray('  # Copy SKILL.md to ~/.claude/skills/prd/'))
      throw err
    }
    throw err
  }

  const transformedSkill = transformSkillContent(skillContent)

  // Read and transform command
  let commandContent: string
  try {
    commandContent = await readSourceCommand()
  } catch (err) {
    if (err instanceof SourceFileNotFoundError) {
      console.error(chalk.red(`Source command not found: ${getSourceCommandPath()}`))
      console.error(chalk.gray('Install the complete-next-task command globally first:'))
      console.error(chalk.gray('  # Copy complete-next-task.md to ~/.claude/commands/'))
      throw err
    }
    throw err
  }

  const transformedCommand = transformCommandContent(commandContent)

  // Write transformed skill
  const targetSkillDir = getTargetSkillDir()
  const targetSkillPath = getTargetSkillPath()

  try {
    await mkdir(targetSkillDir, { recursive: true })
    await writeFile(targetSkillPath, transformedSkill)
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

  // Write transformed command
  const targetCommandPath = getTargetCommandPath()

  try {
    await writeFile(targetCommandPath, transformedCommand)
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
