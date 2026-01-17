export interface TextContent {
  type: 'text'
  text: string
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent

export interface SystemEvent {
  type: 'system'
  subtype: 'init'
  session_id: string
  tools: string[]
  model: string
}

export interface AssistantEvent {
  type: 'assistant'
  message: {
    content: ContentBlock[]
  }
  session_id: string
}

export interface UserEvent {
  type: 'user'
  message: {
    content: ToolResultContent[]
  }
}

export interface ResultEvent {
  type: 'result'
  subtype: 'success' | 'error_max_turns' | 'error_during_execution'
  is_error: boolean
  duration_ms: number
  result?: string
}

export type StreamEvent = SystemEvent | AssistantEvent | UserEvent | ResultEvent
