import { spawn } from 'node:child_process'
import chalk from 'chalk'
import type { Agent, AgentResult, ExecuteOptions } from './base.js'
import { NDJSONParser } from '../utils/ndjson.js'
import { formatEvent } from './claude-formatter.js'
import type { StreamEvent } from './claude-events.js'

export const claude: Agent = {
  name: 'claude',

  async execute(prompt: string, cwd: string, options?: ExecuteOptions): Promise<AgentResult> {
    const startTime = Date.now()
    const onOutput = options?.onOutput
    const onPersist = options?.onPersist
    const onStderr = options?.onStderr

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', [
        '-p',
        '--verbose',
        '--dangerously-skip-permissions',
        '--output-format', 'stream-json',
      ], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      let rawOutput = ''
      let textOutput = ''
      let stderr = ''

      const parser = new NDJSONParser<StreamEvent>(
        (event) => {
          const formatted = formatEvent(event)
          if (formatted) {
            onOutput?.(formatted + '\n')
            // Persist with event boundary flag (event is complete)
            onPersist?.(formatted + '\n', true)
          }

          // Accumulate text content for completion marker detection
          if (event.type === 'assistant') {
            for (const block of event.message.content) {
              if (block.type === 'text') {
                textOutput += block.text
              }
            }
          }
        },
        (_error, line) => {
          const warning = chalk.yellow(`[warn] malformed JSON: ${line.slice(0, 100)}\n`)
          onOutput?.(warning)
          onPersist?.(warning, false)
        }
      )

      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString()
        rawOutput += chunk
        parser.push(chunk)
      })

      proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString()
        stderr += chunk
        onOutput?.(chalk.red(chunk))
        onStderr?.(chunk)
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`))
      })

      proc.on('close', (code) => {
        parser.flush()
        const duration = Date.now() - startTime
        resolve({
          output: textOutput + (stderr ? `\n[stderr]\n${stderr}` : ''),
          exitCode: code ?? 1,
          duration,
        })
      })

      proc.stdin.write(prompt)
      proc.stdin.end()
    })
  },
}
