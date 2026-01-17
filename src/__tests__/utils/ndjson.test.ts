import { describe, it, expect, vi } from 'vitest'
import { NDJSONParser } from '../../utils/ndjson.js'

describe('utils/ndjson', () => {
  it('parses complete JSON lines', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('{"foo":"bar"}\n')

    expect(onEvent).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('buffers incomplete lines', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('{"foo":')
    expect(onEvent).not.toHaveBeenCalled()

    parser.push('"bar"}\n')
    expect(onEvent).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('handles multiple lines in one chunk', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('{"a":1}\n{"b":2}\n')

    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(onEvent).toHaveBeenCalledWith({ a: 1 })
    expect(onEvent).toHaveBeenCalledWith({ b: 2 })
  })

  it('flushes remaining buffer', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('{"final":true}')
    expect(onEvent).not.toHaveBeenCalled()

    parser.flush()
    expect(onEvent).toHaveBeenCalledWith({ final: true })
  })

  it('calls onError for malformed JSON', () => {
    const onEvent = vi.fn()
    const onError = vi.fn()
    const parser = new NDJSONParser(onEvent, onError)

    parser.push('not json\n')

    expect(onEvent).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'not json')
  })

  it('skips empty lines', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('\n\n{"a":1}\n\n')

    expect(onEvent).toHaveBeenCalledTimes(1)
  })

  it('handles split JSON across chunks', () => {
    const onEvent = vi.fn()
    const parser = new NDJSONParser(onEvent)

    parser.push('{"key":"va')
    parser.push('lue"}\n')

    expect(onEvent).toHaveBeenCalledWith({ key: 'value' })
  })
})
