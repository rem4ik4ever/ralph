import type { ChildProcess } from 'node:child_process'

export interface AgentResult {
  output: string
  exitCode: number
  duration: number
}

export interface ExecuteOptions {
  onOutput?: (chunk: string) => void
  /** Called for each formatted event for persistence. isEventBoundary signals event completion. */
  onPersist?: (chunk: string, isEventBoundary: boolean) => void
  /** Called for stderr content */
  onStderr?: (chunk: string) => void
  /** Called with spawned process for signal handling */
  onProcess?: (proc: ChildProcess) => void
}

export interface Agent {
  name: string
  execute(prompt: string, cwd: string, options?: ExecuteOptions): Promise<AgentResult>
}

export type AgentType = 'claude'

export const SUPPORTED_AGENTS: AgentType[] = ['claude']

export function isValidAgent(agent: string): agent is AgentType {
  return SUPPORTED_AGENTS.includes(agent as AgentType)
}
