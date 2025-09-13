import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../server.js'
import { runMigrations } from '../db/migrate.js'
import { db } from '../db/index.js'
import { sessions, messages, audioFiles } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const TEST_PORT = 4402 // Unique port for message tests to avoid conflicts
let server: Server

beforeAll(async () => {
  // Run migrations to create tables
  await runMigrations()
  
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

beforeEach(async () => {
  // Clean up any test data - delete child tables first to avoid foreign key constraints
  await db.delete(messages)
  await db.delete(audioFiles)
  await db.delete(sessions)
})

describe('Step 06: Transcript Messages', () => {
  describe('Message Persistence', () => {
    it('should insert message with zod-validated payload and read back sorted by ts_ms', async () => {
      // Create a session first
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Message Test Session'
        })
      })
      
      expect(sessionResponse.status).toBe(200)
      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId
      
      // Insert first message - Human speaking
      const message1Response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'human',
          text: 'Hello, this is Mikkel speaking first',
          ts_ms: 1000,
          raw_json: { type: 'conversation.item.input_audio_transcription.completed', text: 'Hello, this is Mikkel speaking first' }
        })
      })
      
      expect(message1Response.status).toBe(200) // This will fail until route is implemented
      
      // Insert second message - AI responding
      const message2Response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'ai',
          text: 'Hi Mikkel, this is Freja responding',
          ts_ms: 2000,
          raw_json: { type: 'response.audio_transcript.delta', text: 'Hi Mikkel, this is Freja responding' }
        })
      })
      
      expect(message2Response.status).toBe(200) // This will fail until route is implemented
      
      // Insert third message - Human again (out of order timestamp to test sorting)
      const message3Response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'human',
          text: 'Actually, let me clarify something',
          ts_ms: 1500,
          raw_json: { type: 'conversation.item.input_audio_transcription.completed', text: 'Actually, let me clarify something' }
        })
      })
      
      expect(message3Response.status).toBe(200) // This will fail until route is implemented
      
      // Read back messages sorted by ts_ms
      const messagesResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages`)
      
      expect(messagesResponse.status).toBe(200) // This will fail until route is implemented
      const messagesData = await messagesResponse.json()
      
      expect(messagesData).toHaveProperty('messages')
      expect(messagesData.messages).toHaveLength(3)
      
      // Verify messages are sorted by ts_ms (ascending order)
      expect(messagesData.messages[0].ts_ms).toBe(1000)
      expect(messagesData.messages[0].speaker).toBe('human')
      expect(messagesData.messages[0].text).toBe('Hello, this is Mikkel speaking first')
      
      expect(messagesData.messages[1].ts_ms).toBe(1500)
      expect(messagesData.messages[1].speaker).toBe('human')
      expect(messagesData.messages[1].text).toBe('Actually, let me clarify something')
      
      expect(messagesData.messages[2].ts_ms).toBe(2000)
      expect(messagesData.messages[2].speaker).toBe('ai')
      expect(messagesData.messages[2].text).toBe('Hi Mikkel, this is Freja responding')
      
      // Verify raw_json is preserved
      expect(messagesData.messages[0]).toHaveProperty('raw_json')
      expect(messagesData.messages[0].raw_json.type).toBe('conversation.item.input_audio_transcription.completed')
    })

    it('should validate message payload with Zod schema', async () => {
      // Create a session first
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Validation Test Session'
        })
      })
      
      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId
      
      // Test invalid payload - missing required fields
      const invalidResponse1 = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'mikkel',
          // missing text, ts_ms, raw_json
        })
      })
      
      expect(invalidResponse1.status).toBe(400) // This will fail until validation is implemented
      
      // Test invalid payload - wrong speaker value
      const invalidResponse2 = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'invalid_speaker',
          text: 'This should fail',
          ts_ms: 1000,
          raw_json: {}
        })
      })
      
      expect(invalidResponse2.status).toBe(400) // This will fail until validation is implemented
      
      // Test invalid payload - negative timestamp
      const invalidResponse3 = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'mikkel',
          text: 'Negative timestamp test',
          ts_ms: -100,
          raw_json: {}
        })
      })
      
      expect(invalidResponse3.status).toBe(400) // This will fail until validation is implemented
    })

    it('should handle non-existent session gracefully', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/fake-session-id/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'mikkel',
          text: 'This should fail',
          ts_ms: 1000,
          raw_json: {}
        })
      })
      
      expect(response.status).toBe(404) // This will fail until route is implemented
      
      const errorData = await response.json()
      expect(errorData.error).toContain('Session not found') // This will fail until error handling is implemented
    })
  })
})
