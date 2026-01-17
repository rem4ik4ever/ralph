import chalk from 'chalk'
import type { StreamEvent, ContentBlock, ToolResultContent, ResultEvent } from './claude-events.js'

export function formatEvent(event: StreamEvent): string | null {
  switch (event.type) {
    case 'system':
      return chalk.gray(`[session] ${event.session_id} model=${event.model}`)

    case 'assistant':
      return formatAssistantContent(event.message.content)

    case 'user':
      return formatToolResults(event.message.content)

    case 'result':
      return formatResult(event)

    default:
      return null
  }
}

function formatAssistantContent(content: ContentBlock[]): string {
  const lines: string[] = []

  for (const block of content) {
    if (block.type === 'text') {
      lines.push(block.text)
    } else if (block.type === 'tool_use') {
      lines.push(chalk.cyan(`[tool] ${block.name}`))
      lines.push(chalk.gray(JSON.stringify(block.input, null, 2)))
    }
  }

  return lines.join('\n')
}

function formatToolResults(content: ToolResultContent[]): string {
  const lines: string[] = []

  for (const block of content) {
    const preview = block.content.length > 200
      ? block.content.slice(0, 200) + '...'
      : block.content
    lines.push(chalk.green(`[result] ${preview}`))
  }

  return lines.join('\n')
}

function formatResult(event: ResultEvent): string {
  if (event.is_error) {
    return chalk.red(`[done] ${event.subtype} (${event.duration_ms}ms)`)
  }
  return chalk.green(`[done] ${event.subtype} (${event.duration_ms}ms)`)
}
