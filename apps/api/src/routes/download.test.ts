import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../server.js'
import { runMigrations } from '../db/migrate.js'
import { db } from '../db/index.js'
import { sessions, audioFiles, messages } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const TEST_PORT = 4399 // Different port for download tests
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
  // Clean up any test data (delete dependent records first to avoid FK constraints)
  await db.delete(messages)
  await db.delete(audioFiles)
  await db.delete(sessions)

  // Clean up test session directories
  const sessionsDir = path.join(process.cwd(), 'sessions')
  try {
    const sessionDirs = await fs.readdir(sessionsDir)
    for (const dir of sessionDirs) {
      if (dir.includes('test-session')) {
        await fs.rm(path.join(sessionsDir, dir), { recursive: true, force: true })
      }
    }
  } catch (error) {
    // Ignore if sessions directory doesn't exist
  }
})

describe('Step 9: File Download and Export', () => {
  describe('Audio File Download', () => {
    it('should stream WAV file with correct content-type for mikkel speaker', async () => {
      // Create test session with audio file
      const sessionId = `test-session-${randomUUID()}`
      const sessionDir = path.join(process.cwd(), 'sessions', sessionId)
      const mikkelFilePath = path.join(sessionDir, 'mikkel.wav')

      // Create session directory and test audio file
      await fs.mkdir(sessionDir, { recursive: true })
      const testAudioData = Buffer.from('test-wav-data-mikkel')
      await fs.writeFile(mikkelFilePath, testAudioData)

      // Create session in database
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Download Test Session',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // Create audio file record
      await db.insert(audioFiles).values({
        id: randomUUID(),
        sessionId,
        speaker: 'mikkel',
        filePath: mikkelFilePath,
        size: testAudioData.length,
        format: 'wav',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // Test the download endpoint
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/file/mikkel`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      expect(response.headers.get('content-type')).toBe('audio/wav') // This will fail until headers are set

      const audioData = await response.arrayBuffer()
      expect(Buffer.from(audioData)).toEqual(testAudioData) // This will fail until file streaming works
    })

    it('should stream WAV file with correct content-type for freja speaker', async () => {
      // Create test session with audio file
      const sessionId = `test-session-${randomUUID()}`
      const sessionDir = path.join(process.cwd(), 'sessions', sessionId)
      const frejaFilePath = path.join(sessionDir, 'freja.wav')

      // Create session directory and test audio file
      await fs.mkdir(sessionDir, { recursive: true })
      const testAudioData = Buffer.from('test-wav-data-freja')
      await fs.writeFile(frejaFilePath, testAudioData)

      // Create session in database
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Download Test Session Freja',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // Create audio file record
      await db.insert(audioFiles).values({
        id: randomUUID(),
        sessionId,
        speaker: 'freja',
        filePath: frejaFilePath,
        size: testAudioData.length,
        format: 'wav',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // Test the download endpoint
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/file/freja`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      expect(response.headers.get('content-type')).toBe('audio/wav') // This will fail until headers are set

      const audioData = await response.arrayBuffer()
      expect(Buffer.from(audioData)).toEqual(testAudioData) // This will fail until file streaming works
    })

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/fake-session-id/file/mikkel`)

      expect(response.status).toBe(404) // This will fail until endpoint is implemented

      const errorData = await response.json()
      expect(errorData.error).toContain('Session not found') // This will fail until error handling exists
    })

    it('should return 400 for invalid speaker', async () => {
      const sessionId = `test-session-${randomUUID()}`

      // Create session in database
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Invalid Speaker Test',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/file/invalid-speaker`)

      expect(response.status).toBe(400) // This will fail until endpoint validation exists

      const errorData = await response.json()
      expect(errorData.error).toContain('Invalid speaker') // This will fail until validation exists
    })

    it('should return 404 for non-existent audio file', async () => {
      const sessionId = `test-session-${randomUUID()}`

      // Create session without audio files
      await db.insert(sessions).values({
        id: sessionId,
        title: 'No Audio Test',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/file/mikkel`)

      expect(response.status).toBe(404) // This will fail until endpoint checks for file existence

      const errorData = await response.json()
      expect(errorData.error).toContain('Audio file not found') // This will fail until error handling exists
    })
  })

  describe('Transcript Export', () => {
    it('should export transcript as JSON with correct content-type', async () => {
      // Create test session with messages
      const sessionId = `test-session-${randomUUID()}`
      const now = Date.now()

      // Create session in database
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Transcript JSON Test',
        status: 'completed',
        lastHeartbeat: now,
        createdAt: now,
        updatedAt: now
      })

      // Create test messages
      await db.insert(messages).values([
        {
          sessionId,
          speaker: 'mikkel',
          text: 'Hello, this is Mikkel',
          tsMs: 1000,
          rawJson: JSON.stringify({ type: 'speech' }),
          createdAt: now
        },
        {
          sessionId,
          speaker: 'freja',
          text: 'Hi Mikkel, this is Freja responding',
          tsMs: 2500,
          rawJson: JSON.stringify({ type: 'speech' }),
          createdAt: now + 1000
        }
      ])

      // Test the JSON export endpoint
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/transcript.json`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      expect(response.headers.get('content-type')).toContain('application/json') // This will fail until headers are set

      const transcriptData = await response.json()
      expect(transcriptData).toHaveProperty('sessionId', sessionId) // This will fail until JSON structure exists
      expect(transcriptData).toHaveProperty('messages') // This will fail until messages are included
      expect(transcriptData.messages).toHaveLength(2) // This will fail until messages are exported

      // Verify message order (should be sorted by ts_ms)
      expect(transcriptData.messages[0].speaker).toBe('mikkel') // This will fail until sorting works
      expect(transcriptData.messages[1].speaker).toBe('freja') // This will fail until sorting works
    })

    it('should export transcript as Markdown with correct content-type', async () => {
      // Create test session with messages
      const sessionId = `test-session-${randomUUID()}`
      const now = Date.now()

      // Create session in database
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Transcript Markdown Test',
        status: 'completed',
        lastHeartbeat: now,
        createdAt: now,
        updatedAt: now
      })

      // Create test messages
      await db.insert(messages).values([
        {
          sessionId,
          speaker: 'mikkel',
          text: 'This is a test transcript',
          tsMs: 1000,
          rawJson: JSON.stringify({ type: 'speech' }),
          createdAt: now
        },
        {
          sessionId,
          speaker: 'freja',
          text: 'And this is the response',
          tsMs: 2500,
          rawJson: JSON.stringify({ type: 'speech' }),
          createdAt: now + 1000
        }
      ])

      // Test the Markdown export endpoint
      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/transcript.md`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented
      expect(response.headers.get('content-type')).toContain('text/markdown') // This will fail until headers are set

      const markdownContent = await response.text()
      expect(markdownContent.length).toBeGreaterThan(0) // This will fail until markdown generation exists
      expect(markdownContent).toContain('mikkel') // This will fail until speaker names are included
      expect(markdownContent).toContain('freja') // This will fail until speaker names are included
      expect(markdownContent).toContain('This is a test transcript') // This will fail until message text is included
      expect(markdownContent).toContain('And this is the response') // This will fail until message text is included
    })

    it('should return empty but valid JSON for session with no messages', async () => {
      const sessionId = `test-session-${randomUUID()}`

      // Create session without messages
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Empty Session Test',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/transcript.json`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented

      const transcriptData = await response.json()
      expect(transcriptData).toHaveProperty('sessionId', sessionId) // This will fail until structure exists
      expect(transcriptData).toHaveProperty('messages') // This will fail until messages array exists
      expect(transcriptData.messages).toHaveLength(0) // This will fail until empty array is returned
    })

    it('should return valid markdown with header for session with no messages', async () => {
      const sessionId = `test-session-${randomUUID()}`

      // Create session without messages
      await db.insert(sessions).values({
        id: sessionId,
        title: 'Empty Markdown Test',
        status: 'completed',
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const response = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/transcript.md`)

      expect(response.status).toBe(200) // This will fail until endpoint is implemented

      const markdownContent = await response.text()
      expect(markdownContent.length).toBeGreaterThan(0) // This will fail until basic markdown is generated
      expect(markdownContent).toContain('# ') // This will fail until markdown header exists
      expect(markdownContent).toContain('Empty Markdown Test') // This will fail until session title is included
    })

    it('should return 404 for transcript export of non-existent session', async () => {
      const jsonResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/fake-session-id/transcript.json`)
      expect(jsonResponse.status).toBe(404) // This will fail until endpoint validation exists

      const mdResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/fake-session-id/transcript.md`)
      expect(mdResponse.status).toBe(404) // This will fail until endpoint validation exists

      const jsonError = await jsonResponse.json()
      expect(jsonError.error).toContain('Session not found') // This will fail until error handling exists

      const mdError = await mdResponse.json()
      expect(mdError.error).toContain('Session not found') // This will fail until error handling exists
    })
  })
})