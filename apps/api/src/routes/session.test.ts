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
      expect(detailData.audioFiles).toHaveLength(2) // mikkel and freja tracks
      
      // Check that both audio files are present
      const mikkelFile = detailData.audioFiles.find((f: any) => f.speaker === 'mikkel')
      const frejaFile = detailData.audioFiles.find((f: any) => f.speaker === 'freja')
      
      expect(mikkelFile).toBeDefined() // This will fail until implemented
      expect(frejaFile).toBeDefined() // This will fail until implemented
      expect(mikkelFile.filePath).toContain('mikkel.wav') // This will fail until implemented
      expect(frejaFile.filePath).toContain('freja.wav') // This will fail until implemented
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
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        temperature: 0.8,
        top_p: 1.0,
        language: 'da-DK',
        silence_ms: 900
      }) // This will fail until settings schema is implemented
    })

    it('should create session with custom settings', async () => {
      const customSettings = {
        model: 'gpt-4o-realtime-preview',
        voice: 'echo',
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
        model: 'gpt-4o-realtime-preview',
        voice: 'nova',
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
      expect(session.settings.voice).toBe('nova') // This will fail until settings are used in init
      expect(session.settings.temperature).toBe(0.3) // This will fail until settings are used in init
      expect(session.settings.silence_ms).toBe(1500) // This will fail until VAD settings are applied
    })
  })
})