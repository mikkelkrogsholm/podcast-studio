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

  describe('Concurrent Message Saves', () => {
    it('should handle multiple messages posted simultaneously without data corruption', async () => {
      // Create a session first
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Concurrent Test Session'
        })
      })

      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId

      // Create 5 concurrent message saves
      const messagePromises = []
      for (let i = 0; i < 5; i++) {
        const messagePromise = fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            speaker: i % 2 === 0 ? 'human' : 'ai',
            text: `Concurrent message ${i}`,
            ts_ms: 1000 + (i * 100),
            raw_json: { type: 'concurrent_test', index: i }
          })
        })
        messagePromises.push(messagePromise)
      }

      // Wait for all requests to complete
      const responses = await Promise.all(messagePromises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200) // This will fail until route handles concurrency
      })

      // Verify all messages were saved correctly
      const messagesResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages`)
      expect(messagesResponse.status).toBe(200)

      const messagesData = await messagesResponse.json()
      expect(messagesData.messages).toHaveLength(5)

      // Verify no data corruption - all messages have unique content
      const texts = messagesData.messages.map((m: any) => m.text)
      const uniqueTexts = new Set(texts)
      expect(uniqueTexts.size).toBe(5) // No duplicates from race conditions
    })
  })

  describe('Pagination Support', () => {
    it('should return paginated messages with limit and offset', async () => {
      // Create a session first
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Pagination Test Session'
        })
      })

      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId

      // Add 10 messages sequentially
      for (let i = 0; i < 10; i++) {
        await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            speaker: i % 2 === 0 ? 'human' : 'ai',
            text: `Message ${i}`,
            ts_ms: 1000 + (i * 100),
            raw_json: { type: 'pagination_test', index: i }
          })
        })
      }

      // Test first page (limit 3)
      const page1Response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?limit=3&offset=0`)
      expect(page1Response.status).toBe(200) // This will fail until pagination is implemented

      const page1Data = await page1Response.json()
      expect(page1Data.messages).toHaveLength(3)
      expect(page1Data.messages[0].text).toBe('Message 0') // First message
      expect(page1Data.total).toBe(10) // Total count should be included
      expect(page1Data.hasMore).toBe(true) // Should indicate more pages exist

      // Test second page (limit 3, offset 3)
      const page2Response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?limit=3&offset=3`)
      expect(page2Response.status).toBe(200)

      const page2Data = await page2Response.json()
      expect(page2Data.messages).toHaveLength(3)
      expect(page2Data.messages[0].text).toBe('Message 3') // Fourth message
      expect(page2Data.total).toBe(10)
      expect(page2Data.hasMore).toBe(true)

      // Test last page
      const lastPageResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?limit=3&offset=9`)
      expect(lastPageResponse.status).toBe(200)

      const lastPageData = await lastPageResponse.json()
      expect(lastPageData.messages).toHaveLength(1) // Only one message left
      expect(lastPageData.messages[0].text).toBe('Message 9')
      expect(lastPageData.hasMore).toBe(false) // No more pages
    })

    it('should handle invalid pagination parameters gracefully', async () => {
      // Create a session with one message
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Pagination Error Test'
        })
      })

      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId

      // Test negative limit
      const negativeResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?limit=-1`)
      expect(negativeResponse.status).toBe(400) // This will fail until validation is implemented

      // Test excessive limit
      const excessiveResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?limit=1000`)
      expect(excessiveResponse.status).toBe(400) // Should cap at reasonable limit

      // Test negative offset
      const negativeOffsetResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/messages?offset=-1`)
      expect(negativeOffsetResponse.status).toBe(400)
    })
  })

  describe('Network Error Handling', () => {
    it('should return appropriate error for database connection failures', async () => {
      // This test would require mocking the database connection to simulate failure
      // For now, we'll test with a malformed session ID that causes DB issues
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/null/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          speaker: 'human',
          text: 'This should cause DB error',
          ts_ms: 1000,
          raw_json: {}
        })
      })

      expect(response.status).toBe(500) // This will fail until DB error handling is implemented

      const errorData = await response.json()
      expect(errorData.error).toContain('Database error') // This will fail until error messages are implemented
    })

    it('should handle malformed JSON gracefully', async () => {
      const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Malformed JSON Test'
        })
      })

      const sessionData = await sessionResponse.json()
      const sessionId = sessionData.sessionId

      // Send malformed JSON
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{ invalid json here }'
      })

      expect(response.status).toBe(400) // This will fail until JSON parsing error handling is implemented

      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid JSON') // This will fail until error messages are implemented
    })
  })
})
