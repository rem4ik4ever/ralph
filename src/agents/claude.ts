import { spawn } from 'node:child_process'
import type { Agent, AgentResult, ExecuteOptions } from './base.js'

function parseStreamJson(line: string): string | null {
  try {
    const data = JSON.parse(line)
    // Only parse assistant messages, skip result (already streamed)
    if (data.type === 'assistant' && data.message?.content) {
      for (const block of data.message.content) {
        if (block.type === 'text') {
          return block.text
        }
      }
    }
  } catch {
    // Not valid JSON, ignore
  }
  return null
}

export const claude: Agent = {
  name: 'claude',

  async execute(prompt: string, cwd: string, options?: ExecuteOptions): Promise<AgentResult> {
    const startTime = Date.now()
    const onOutput = options?.onOutput

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', [
        '-p',
        '--dangerously-skip-permissions',
        '--output-format', 'stream-json',
        '--verbose',
      ], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      let output = ''
      let stderr = ''
      let buffer = ''

      proc.stdout.on('data', (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          const text = parseStreamJson(line)
          if (text) {
            output += text
            onOutput?.(text)
          }
        }
      })

      proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString()
        stderr += chunk
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`))
      })

      proc.on('close', (code) => {
        // Process any remaining buffer
        if (buffer.trim()) {
          const text = parseStreamJson(buffer)
          if (text) {
            output += text
            onOutput?.(text)
          }
        }

        const duration = Date.now() - startTime
        resolve({
          output: output + (stderr ? `\n[stderr]\n${stderr}` : ''),
          exitCode: code ?? 1,
          duration,
        })
      })

      proc.stdin.write(prompt)
      proc.stdin.end()
    })
  },
}
