import chalk from 'chalk'
import { select, confirm } from '@inquirer/prompts'
import type { AgentType } from '../prd/types.js'

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
