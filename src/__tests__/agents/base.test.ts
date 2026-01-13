import { describe, it, expect } from 'vitest'
import { isValidAgent, SUPPORTED_AGENTS } from '../../agents/base.js'

describe('agents/base', () => {
  describe('isValidAgent', () => {
    it('returns true for claude', () => {
      expect(isValidAgent('claude')).toBe(true)
    })

    it('returns false for unknown agents', () => {
      expect(isValidAgent('unknown')).toBe(false)
      expect(isValidAgent('openai')).toBe(false)
      expect(isValidAgent('')).toBe(false)
    })
  })

  describe('SUPPORTED_AGENTS', () => {
    it('contains claude', () => {
      expect(SUPPORTED_AGENTS).toContain('claude')
    })

    it('has correct length', () => {
      expect(SUPPORTED_AGENTS).toHaveLength(1)
    })
  })
})
