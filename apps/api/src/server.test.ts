import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'http'
import { app, PORT } from './server.js'

let server: Server

beforeAll(() => {
  return new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
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
    const response = await fetch(`http://localhost:${PORT}/health`)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
  })
})