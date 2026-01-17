export type AgentType = 'claude' | 'codex' | 'opencode'

export interface InitConfig {
  agent: AgentType
  initialized: string
}

export interface PrdTask {
  id: string
  category: string
  description: string
  steps: string[]
  passes: boolean
}

export interface PrdJson {
  prdName: string
  tasks: PrdTask[]
  context?: {
    patterns?: string[]
    keyFiles?: string[]
    nonGoals?: string[]
  }
}

export type PrdStatusType = 'pending' | 'in_progress' | 'completed'

export type PrdLocation = 'local' | 'global' | 'auto'

export type PrdDirMode = 'read' | 'write'

export interface PrdStatus {
  name: string
  description: string
  status: PrdStatusType
  tasksTotal: number
  tasksCompleted: number
  location: 'local' | 'global'
}
