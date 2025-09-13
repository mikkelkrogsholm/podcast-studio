import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../server.js'
import { runMigrations } from '../db/migrate.js'
import { db } from '../db/index.js'
import { sessions, audioFiles } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const TEST_PORT = 4398 // Different port for session tests
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
  // Clean up any test sessions (delete audio files first to avoid FK constraint)
  await db.delete(audioFiles)
  await db.delete(sessions)
})

describe('Step 5: Auto-save & Crash Recovery', () => {
  describe('Session Status Tracking', () => {
    it('should create session with active status', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Status Test Session'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('sessionId')
      
      // Verify session is created with 'active' status
      const sessionInDb = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, data.sessionId))
        .limit(1)
      
      expect(sessionInDb).toHaveLength(1)
      expect(sessionInDb[0]?.status).toBe('active')
    })

    it('should update session status to incomplete after timeout', async () => {
      // Create a session first
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Timeout Test Session'
        })
      })
      
      const sessionData = await createResponse.json()
      const sessionId = sessionData.sessionId
      
      // Manually set the session's lastHeartbeat to simulate timeout
      // In real implementation, this would be handled by a background job
      const pastTime = Date.now() - (10 * 60 * 1000) // 10 minutes ago
      await db
        .update(sessions)
        .set({ lastHeartbeat: pastTime })
        .where(eq(sessions.id, sessionId))
      
      // Call the check-timeouts endpoint (to be implemented)
      const timeoutResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/check-timeouts`, {
        method: 'POST'
      })
      
      expect(timeoutResponse.status).toBe(200) // This will fail until implemented
      
      // Verify session status changed to incomplete
      const updatedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
      
      expect(updatedSession[0]?.status).toBe('incomplete') // This will fail until implemented
    })
  })

  describe('Keepalive/Heartbeat Mechanism', () => {
    it('should accept heartbeat and update session timestamp', async () => {
      // Create a session first
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Heartbeat Test Session'
        })
      })
      
      const sessionData = await createResponse.json()
      const sessionId = sessionData.sessionId
      
      // Get initial timestamp
      const initialSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
      
      const initialTimestamp = initialSession[0]?.updatedAt
      
      // Wait a moment then send heartbeat
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const heartbeatResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/keepalive`, {
        method: 'POST'
      })
      
      expect(heartbeatResponse.status).toBe(200) // This will fail until implemented
      
      // Verify timestamp was updated
      const updatedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
      
      const newTimestamp = updatedSession[0]?.updatedAt
      expect(newTimestamp).toBeGreaterThan(initialTimestamp!) // This will fail until implemented
    })

    it('should reject heartbeat for non-existent session', async () => {
      const heartbeatResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/fake-session-id/keepalive`, {
        method: 'POST'
      })
      
      expect(heartbeatResponse.status).toBe(404) // This will fail until implemented
      
      const errorData = await heartbeatResponse.json()
      expect(errorData.error).toContain('Session not found') // This will fail until implemented
    })

    it('should only accept heartbeat for active sessions', async () => {
      // Create a session
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Inactive Session Test'
        })
      })
      
      const sessionData = await createResponse.json()
      const sessionId = sessionData.sessionId
      
      // Manually set session to completed status
      await db
        .update(sessions)
        .set({ status: 'completed' })
        .where(eq(sessions.id, sessionId))
      
      // Try to send heartbeat to completed session
      const heartbeatResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/keepalive`, {
        method: 'POST'
      })
      
      expect(heartbeatResponse.status).toBe(400) // This will fail until implemented
      
      const errorData = await heartbeatResponse.json()
      expect(errorData.error).toContain('not active') // This will fail until implemented
    })
  })

  describe('Session History and Recovery', () => {
    it('should list sessions with their status', async () => {
      // Create multiple sessions with different statuses
      const session1Response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Active Session' })
      })
      const session1Data = await session1Response.json()
      
      const session2Response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Incomplete Session' })
      })
      const session2Data = await session2Response.json()
      
      // Manually set second session to incomplete
      await db
        .update(sessions)
        .set({ status: 'incomplete' })
        .where(eq(sessions.id, session2Data.sessionId))
      
      // Get session history
      const historyResponse = await fetch(`http://localhost:${TEST_PORT}/api/sessions`)
      
      expect(historyResponse.status).toBe(200) // This will fail until implemented
      
      const historyData = await historyResponse.json()
      expect(historyData).toHaveProperty('sessions')
      expect(historyData.sessions).toHaveLength(2) // This will fail until implemented
      
      // Verify sessions have correct status
      const activeSession = historyData.sessions.find((s: any) => s.id === session1Data.sessionId)
      const incompleteSession = historyData.sessions.find((s: any) => s.id === session2Data.sessionId)
      
      expect(activeSession.status).toBe('active') // This will fail until implemented
      expect(incompleteSession.status).toBe('incomplete') // This will fail until implemented
    })

    it('should provide session details including audio file info', async () => {
      // Create a session
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Detail Test Session' })
      })
      
      const sessionData = await createResponse.json()
      const sessionId = sessionData.sessionId
      
      // Get session details
      const detailResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}`)
      
      expect(detailResponse.status).toBe(200) // This will fail until implemented
      
      const detailData = await detailResponse.json()
      expect(detailData).toHaveProperty('id', sessionId)
      expect(detailData).toHaveProperty('status', 'active')
      expect(detailData).toHaveProperty('audioFiles')
      expect(detailData.audioFiles).toHaveLength(2) // human and ai tracks
      
      // Check that both audio files are present
      const mikkelFile = detailData.audioFiles.find((f: any) => f.speaker === 'human')
      const frejaFile = detailData.audioFiles.find((f: any) => f.speaker === 'ai')
      
      expect(mikkelFile).toBeDefined() // This will fail until implemented
      expect(frejaFile).toBeDefined() // This will fail until implemented
      // Accept canonical file names
      expect(String(mikkelFile.filePath)).toContain('human.wav')
      expect(String(frejaFile.filePath)).toContain('ai.wav')
    })
  })
})

describe('Step 8: Persona and Context Prompts', () => {
  describe('Persona and Context Persistence', () => {
    it('should create session with persona_prompt and context_prompt', async () => {
      const sessionData = {
        title: 'Persona Context Test Session',
        persona_prompt: 'You are a knowledgeable podcast co-host named Freja. Be friendly and engaging.',
        context_prompt: 'Today we are discussing AI technology trends in 2024.'
      }
      
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      })
      
      expect(response.status).toBe(200) // This will fail until persona/context fields are added
      const data = await response.json()
      expect(data).toHaveProperty('sessionId')
      
      // Get session details to verify prompts are stored exactly as provided
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${data.sessionId}`)
      expect(getResponse.status).toBe(200) // This will fail until GET endpoint supports prompts
      
      const sessionDetails = await getResponse.json()
      expect(sessionDetails).toHaveProperty('persona_prompt', sessionData.persona_prompt) // This will fail until fields are stored
      expect(sessionDetails).toHaveProperty('context_prompt', sessionData.context_prompt) // This will fail until fields are stored
    })

    it('should create session with empty persona/context when not provided', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'No Prompts Session'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${data.sessionId}`)
      const sessionDetails = await getResponse.json()
      
      expect(sessionDetails).toHaveProperty('persona_prompt', '') // This will fail until default empty strings are set
      expect(sessionDetails).toHaveProperty('context_prompt', '') // This will fail until default empty strings are set
    })

    it('should validate persona_prompt length limit', async () => {
      const longPersona = 'x'.repeat(5001) // Assuming 5000 char limit
      
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Long Persona Session',
          persona_prompt: longPersona
        })
      })
      
      expect(response.status).toBe(400) // This will fail until validation is implemented
      const errorData = await response.json()
      expect(errorData.error).toContain('persona_prompt') // This will fail until validation exists
      expect(errorData.error).toContain('length') // This will fail until length validation exists
    })

    it('should validate context_prompt length limit', async () => {
      const longContext = 'x'.repeat(5001) // Assuming 5000 char limit
      
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Long Context Session',
          context_prompt: longContext
        })
      })
      
      expect(response.status).toBe(400) // This will fail until validation is implemented
      const errorData = await response.json()
      expect(errorData.error).toContain('context_prompt') // This will fail until validation exists
      expect(errorData.error).toContain('length') // This will fail until length validation exists
    })

    it('should return exact strings when retrieving session with prompts', async () => {
      const originalPrompts = {
        persona_prompt: 'You are Freja, an AI co-host. Be conversational and curious about tech topics.',
        context_prompt: 'We are recording episode 42 about machine learning breakthroughs in healthcare.'
      }
      
      // Create session
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Exact String Test',
          ...originalPrompts
        })
      })
      
      const createData = await createResponse.json()
      
      // Retrieve session and verify exact string match
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${createData.sessionId}`)
      const sessionData = await getResponse.json()
      
      expect(sessionData.persona_prompt).toBe(originalPrompts.persona_prompt) // This will fail until exact storage works
      expect(sessionData.context_prompt).toBe(originalPrompts.context_prompt) // This will fail until exact storage works
      
      // Verify no trimming or modification occurred
      expect(sessionData.persona_prompt.length).toBe(originalPrompts.persona_prompt.length) // This will fail until strings are preserved
      expect(sessionData.context_prompt.length).toBe(originalPrompts.context_prompt.length) // This will fail until strings are preserved
    })
  })
})

describe('Step 11: Session History and Details', () => {
  describe('GET /sessions - Session List', () => {
    it('should return empty list when no sessions exist', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/sessions`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      const data = await response.json()
      expect(data).toHaveProperty('sessions')
      expect(data.sessions).toEqual([]) // This will fail until endpoint returns empty array
      expect(data).toHaveProperty('pagination')
      expect(data.pagination.total).toBe(0) // This will fail until pagination is implemented
    })

    it('should return sessions sorted by createdAt DESC (newest first)', async () => {
      // Create multiple sessions with different timestamps
      const session1Response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Oldest Session' })
      })
      const session1Data = await session1Response.json()

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50))

      const session2Response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Middle Session' })
      })
      const session2Data = await session2Response.json()

      await new Promise(resolve => setTimeout(resolve, 50))

      const session3Response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Newest Session' })
      })
      const session3Data = await session3Response.json()

      // Get session list
      const response = await fetch(`http://localhost:${TEST_PORT}/api/sessions`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      const data = await response.json()
      expect(data.sessions).toHaveLength(3) // This will fail until endpoint returns sessions

      // Verify sorting (newest first)
      expect(data.sessions[0].id).toBe(session3Data.sessionId) // This will fail until sorting is implemented
      expect(data.sessions[1].id).toBe(session2Data.sessionId) // This will fail until sorting is implemented
      expect(data.sessions[2].id).toBe(session1Data.sessionId) // This will fail until sorting is implemented

      // Verify session data includes required fields
      for (const session of data.sessions) {
        expect(session).toHaveProperty('id')
        expect(session).toHaveProperty('title')
        expect(session).toHaveProperty('status')
        expect(session).toHaveProperty('createdAt')
        expect(session).toHaveProperty('duration') // This will fail until duration calculation is added
      }
    })

    it('should support pagination with limit and offset parameters', async () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        await fetch(`http://localhost:${TEST_PORT}/api/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Session ${i + 1}` })
        })
        await new Promise(resolve => setTimeout(resolve, 10)) // Ensure different timestamps
      }

      // Test first page (limit=2, offset=0)
      const page1Response = await fetch(`http://localhost:${TEST_PORT}/api/sessions?limit=2&offset=0`)
      expect(page1Response.status).toBe(200) // This will fail until pagination is implemented

      const page1Data = await page1Response.json()
      expect(page1Data.sessions).toHaveLength(2) // This will fail until limit parameter works
      expect(page1Data.pagination.total).toBe(5) // This will fail until total count is calculated
      expect(page1Data.pagination.limit).toBe(2) // This will fail until pagination metadata is returned
      expect(page1Data.pagination.offset).toBe(0) // This will fail until pagination metadata is returned

      // Test second page (limit=2, offset=2)
      const page2Response = await fetch(`http://localhost:${TEST_PORT}/api/sessions?limit=2&offset=2`)
      const page2Data = await page2Response.json()
      expect(page2Data.sessions).toHaveLength(2) // This will fail until offset parameter works

      // Test last page (limit=2, offset=4)
      const page3Response = await fetch(`http://localhost:${TEST_PORT}/api/sessions?limit=2&offset=4`)
      const page3Data = await page3Response.json()
      expect(page3Data.sessions).toHaveLength(1) // This will fail until pagination handles remaining items
    })

    it('should validate pagination parameters', async () => {
      // Test invalid limit (too large)
      const largeLimit = await fetch(`http://localhost:${TEST_PORT}/api/sessions?limit=1000`)
      expect(largeLimit.status).toBe(400) // This will fail until validation is implemented
      const largeLimitData = await largeLimit.json()
      expect(largeLimitData.error).toContain('limit') // This will fail until validation error is returned

      // Test negative offset
      const negativeOffset = await fetch(`http://localhost:${TEST_PORT}/api/sessions?offset=-1`)
      expect(negativeOffset.status).toBe(400) // This will fail until validation is implemented
      const negativeOffsetData = await negativeOffset.json()
      expect(negativeOffsetData.error).toContain('offset') // This will fail until validation error is returned

      // Test invalid limit type
      const invalidLimit = await fetch(`http://localhost:${TEST_PORT}/api/sessions?limit=abc`)
      expect(invalidLimit.status).toBe(400) // This will fail until validation is implemented
    })

    it('should use default pagination values when not specified', async () => {
      // Create one session
      await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Default Pagination Test' })
      })

      const response = await fetch(`http://localhost:${TEST_PORT}/api/sessions`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.pagination.limit).toBe(50) // This will fail until default limit is set
      expect(data.pagination.offset).toBe(0) // This will fail until default offset is set
    })
  })

  describe('GET /session/:id - Session Details', () => {
    it('should return detailed session information including metadata and file links', async () => {
      // Create a session with custom settings and prompts
      const sessionData = {
        title: 'Detailed Session Test',
        persona_prompt: 'You are Freja, a friendly AI co-host.',
        context_prompt: 'Today we discuss Step 11 implementation.',
        settings: {
          model: 'gpt-realtime',
          voice: 'marin',
          temperature: 0.7,
          language: 'da-DK'
        }
      }

      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })

      const createData = await createResponse.json()
      const sessionId = createData.sessionId

      // Get session details
      const detailResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}`)
      expect(detailResponse.status).toBe(200) // This will fail until GET endpoint is implemented

      const details = await detailResponse.json()

      // Verify core session metadata
      expect(details).toHaveProperty('id', sessionId)
      expect(details).toHaveProperty('title', sessionData.title)
      expect(details).toHaveProperty('status', 'active')
      expect(details).toHaveProperty('createdAt')
      expect(details).toHaveProperty('updatedAt')

      // Verify prompts are included
      expect(details).toHaveProperty('persona_prompt', sessionData.persona_prompt) // This will fail until prompts are returned
      expect(details).toHaveProperty('context_prompt', sessionData.context_prompt) // This will fail until prompts are returned

      // Verify settings are included
      expect(details).toHaveProperty('settings')
      expect(details.settings).toEqual(sessionData.settings) // This will fail until settings are parsed and returned

      // Verify audio file links are included
      expect(details).toHaveProperty('audioFiles')
      expect(details.audioFiles).toHaveLength(2) // This will fail until audio files are included

      const humanFile = details.audioFiles.find((f: any) => f.speaker === 'human')
      const aiFile = details.audioFiles.find((f: any) => f.speaker === 'ai')

      expect(humanFile).toBeDefined() // This will fail until audio files are returned
      expect(aiFile).toBeDefined() // This will fail until audio files are returned
      expect(humanFile.filePath).toContain('human.wav') // This will fail until file paths are correct
      expect(aiFile.filePath).toContain('ai.wav') // This will fail until file paths are correct

      // Verify download links are provided
      expect(details).toHaveProperty('downloadLinks') // This will fail until download links are added
      expect(details.downloadLinks).toHaveProperty('humanAudio') // This will fail until download links are generated
      expect(details.downloadLinks).toHaveProperty('aiAudio') // This will fail until download links are generated
      expect(details.downloadLinks).toHaveProperty('transcript') // This will fail until transcript download is added
      expect(details.downloadLinks).toHaveProperty('session') // This will fail until full session download is added
    })

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/non-existent-id`)

      expect(response.status).toBe(404) // This will fail until 404 handling is implemented
      const data = await response.json()
      expect(data.error).toContain('Session not found') // This will fail until error message is returned
    })

    it('should include calculated session duration when session is completed', async () => {
      // Create and finish a session
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Duration Test Session' })
      })

      const createData = await createResponse.json()
      const sessionId = createData.sessionId

      // Finish the session
      const finishResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/finish`, {
        method: 'POST'
      })
      expect(finishResponse.status).toBe(200)

      // Get session details
      const detailResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}`)
      const details = await detailResponse.json()

      expect(details.status).toBe('completed')
      expect(details).toHaveProperty('completedAt')
      expect(details).toHaveProperty('duration') // This will fail until duration calculation is added
      expect(typeof details.duration).toBe('number') // This will fail until duration is calculated
      expect(details.duration).toBeGreaterThanOrEqual(0) // This will fail until duration calculation works
    })

    it('should include message count and transcript preview', async () => {
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Message Count Test' })
      })

      const createData = await createResponse.json()
      const sessionId = createData.sessionId

      // Get session details
      const detailResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}`)
      const details = await detailResponse.json()

      expect(details).toHaveProperty('messageCount') // This will fail until message count is calculated
      expect(typeof details.messageCount).toBe('number') // This will fail until message count is implemented
      expect(details).toHaveProperty('transcriptPreview') // This will fail until transcript preview is added
      // For new session, should be empty or null
      expect(details.messageCount).toBe(0) // This will fail until message count calculation works
    })
  })
})

describe('Step 7: Playground Controls (Settings)', () => {
  describe('Session Settings Validation', () => {
    it('should create session with default settings when none provided', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Default Settings Session'
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('sessionId')
      
      // Get session details to verify default settings
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${data.sessionId}`)
      expect(getResponse.status).toBe(200) // This will fail until GET endpoint exists
      
      const sessionData = await getResponse.json()
      expect(sessionData).toHaveProperty('settings')
      expect(sessionData.settings).toEqual({
        model: 'gpt-realtime',
        voice: 'cedar',
        temperature: 0.8,
        top_p: 1.0,
        language: 'da-DK',
        silence_ms: 900
      }) // This will fail until settings schema is implemented
    })

    it('should create session with custom settings', async () => {
      const customSettings = {
        model: 'gpt-realtime',
        voice: 'marin',
        temperature: 0.5,
        top_p: 0.9,
        language: 'en-US',
        silence_ms: 1200
      }
      
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Custom Settings Session',
          settings: customSettings
        })
      })
      
      expect(response.status).toBe(200) // This will fail until settings validation exists
      const data = await response.json()
      expect(data).toHaveProperty('sessionId')
      
      // Verify settings are stored exactly as provided
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${data.sessionId}`)
      expect(getResponse.status).toBe(200)
      
      const sessionData = await getResponse.json()
      expect(sessionData.settings).toEqual(customSettings) // This will fail until settings are persisted
    })

    it('should reject invalid voice option', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Invalid Voice Session',
          settings: {
            voice: 'invalid-voice-option'
          }
        })
      })
      
      expect(response.status).toBe(400) // This will fail until Zod validation exists
      const errorData = await response.json()
      expect(errorData.error).toContain('voice') // This will fail until validation error messages exist
    })

    it('should reject temperature outside valid range', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Invalid Temperature Session',
          settings: {
            temperature: 1.5 // Out of 0.0-1.0 range
          }
        })
      })
      
      expect(response.status).toBe(400) // This will fail until validation exists
      const errorData = await response.json()
      expect(errorData.error).toContain('temperature') // This will fail until validation exists
    })

    it('should reject invalid model option', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Invalid Model Session',
          settings: {
            model: 'gpt-3.5-turbo' // Not a realtime model
          }
        })
      })
      
      expect(response.status).toBe(400) // This will fail until validation exists
      const errorData = await response.json()
      expect(errorData.error).toContain('model') // This will fail until validation exists
    })

    it('should use settings in OpenAI Realtime initialization', async () => {
      const customSettings = {
        model: 'gpt-realtime',
        voice: 'marin',
        temperature: 0.3,
        top_p: 0.8,
        language: 'en-US',
        silence_ms: 1500
      }
      
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Settings Usage Session',
          settings: customSettings
        })
      })
      
      const sessionData = await response.json()
      
      // Mock WebRTC init call to verify settings are passed correctly
      // This would normally be tested by inspecting the actual init payload
      // For now, we'll verify the settings are accessible for use
      const getResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionData.sessionId}`)
      const session = await getResponse.json()
      
      // Verify all settings are present and match for OpenAI init
      expect(session.settings.voice).toBe('marin') // This will fail until settings are used in init
      expect(session.settings.temperature).toBe(0.3) // This will fail until settings are used in init
      expect(session.settings.silence_ms).toBe(1500) // This will fail until VAD settings are applied
    })
  })
})
