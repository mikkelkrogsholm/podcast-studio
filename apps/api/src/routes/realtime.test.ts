import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { Server } from 'http'
import { app, PORT } from '../server.js'

// Store original fetch
const originalFetch = global.fetch

let server: Server

beforeAll(() => {
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => { // Use random available port
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

describe('POST /api/realtime/token', () => {
  beforeEach(() => {
    // Reset environment variable state
    delete process.env.OPENAI_API_KEY
  })

  it('should return 200 with token when OPENAI_API_KEY is provided', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-key-123'
    
    // Mock fetch for OpenAI API calls only
    const mockFetch = vi.fn((url, options) => {
      if (url === 'https://api.openai.com/v1/realtime/sessions') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ client_secret: 'test-client-secret-123' })
        })
      }
      // Use original fetch for other calls (like test requests to server)
      return originalFetch(url, options)
    })
    
    global.fetch = mockFetch
    
    const address = server.address() as any
    const response = await originalFetch(`http://localhost:${address.port}/api/realtime/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    expect(response.status).toBe(200)
    
    if (response.status === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('token')
      expect(typeof data.token).toBe('string')
      expect(data.token).toBe('test-client-secret-123')
    }
    
    // Verify the OpenAI API was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-test-key-123',
          'Content-Type': 'application/json'
        })
      })
    )
    
    // Restore original fetch
    global.fetch = originalFetch
  })

  it('should return 401 when OPENAI_API_KEY is missing', async () => {
    // Ensure OPENAI_API_KEY is not set
    delete process.env.OPENAI_API_KEY
    
    const address = server.address() as any
    const response = await originalFetch(`http://localhost:${address.port}/api/realtime/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    expect(response.status).toBe(401)
  })
})