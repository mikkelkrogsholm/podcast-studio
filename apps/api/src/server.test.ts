import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'http'
import { app } from './server.js'

const TEST_PORT = 4299 // Use a different port for tests
let server: Server

beforeAll(() => {
  return new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve()
    })
  })
})

afterAll(() => {
  return new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
})

describe('GET /health', () => {
  it('should return { ok: true }', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/health`)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
  })
})

describe('POST /api/realtime/token', () => {
  it('should return 401 when OPENAI_API_KEY is missing', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/api/realtime/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    
    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'OPENAI_API_KEY environment variable is required' })
  })
})