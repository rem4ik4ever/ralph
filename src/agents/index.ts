import type { Agent, AgentType } from './base.js'
import { claude } from './claude.js'

const agents: Record<AgentType, Agent> = {
  claude,
}

export function getAgent(type: AgentType): Agent {
  return agents[type]
}

export * from './base.js'
