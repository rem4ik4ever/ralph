export interface AgentResult {
  output: string
  exitCode: number
  duration: number
}

export interface ExecuteOptions {
  onOutput?: (chunk: string) => void
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
