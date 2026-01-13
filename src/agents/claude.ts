import { spawn } from 'node:child_process'
import type { Agent, AgentResult } from './base.js'

export const claude: Agent = {
  name: 'claude',

  async execute(prompt: string, cwd: string): Promise<AgentResult> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', ['-p', '--dangerously-skip-permissions'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`))
      })

      proc.on('close', (code) => {
        const duration = Date.now() - startTime
        resolve({
          output: stdout + (stderr ? `\n[stderr]\n${stderr}` : ''),
          exitCode: code ?? 1,
          duration,
        })
      })

      proc.stdin.write(prompt)
      proc.stdin.end()
    })
  },
}
