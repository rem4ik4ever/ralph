import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

describe('CLI', () => {
  const cliPath = resolve(__dirname, '../index.ts')

  // Helper to run CLI and capture output
  const runCli = (args: string) => {
    try {
      const result = execSync(`npx tsx ${cliPath} ${args}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return { stdout: result, stderr: '', exitCode: 0 }
    } catch (err: any) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.status || 1,
      }
    }
  }

  describe('help', () => {
    it('shows help with --help', () => {
      const { stdout } = runCli('--help')
      expect(stdout).toContain('ralph')
      expect(stdout).toContain('Loop coding agent CLI')
    })

    it('shows run command help', () => {
      const { stdout } = runCli('run --help')
      expect(stdout).toContain('--prompt')
      expect(stdout).toContain('--agent')
      expect(stdout).toContain('--iterations')
    })
  })

  describe('version', () => {
    it('shows version with --version', () => {
      const { stdout } = runCli('--version')
      expect(stdout).toContain('0.1.0')
    })
  })

  describe('run command validation', () => {
    it('requires --prompt option', () => {
      const { stderr, exitCode } = runCli('run')
      expect(exitCode).not.toBe(0)
      expect(stderr).toContain('--prompt')
    })

    it('accepts short -p flag', () => {
      const { stdout } = runCli('run --help')
      expect(stdout).toContain('-p')
    })

    it('accepts short -a flag for agent', () => {
      const { stdout } = runCli('run --help')
      expect(stdout).toContain('-a')
    })

    it('accepts short -i flag for iterations', () => {
      const { stdout } = runCli('run --help')
      expect(stdout).toContain('-i')
    })
  })
})
