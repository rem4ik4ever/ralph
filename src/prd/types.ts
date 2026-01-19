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

export interface PrdFileInfo {
  path: string
  exists: boolean
}

export interface PrdIterationsInfo {
  path: string
  exists: boolean
  fileCount: number
}

export interface PrdInfo {
  name: string
  found: boolean
  location: 'local' | 'global'
  status: 'not_found' | 'partial' | 'in_progress' | 'pending' | 'completed'
  tasksCompleted: number
  tasksTotal: number
  files: {
    prdMd: PrdFileInfo
    prdJson: PrdFileInfo
    progress: PrdFileInfo
    iterations: PrdIterationsInfo
  }
}
