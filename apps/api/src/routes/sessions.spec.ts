import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../server.js'
import { runMigrations } from '../db/migrate.js'
import { db } from '../db/index.js'
import { sessions, audioFiles } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const TEST_PORT = 4399 // Different port for Step 10 tests
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

describe('Step 10: Session Management - Stop/Retry/Interrupt', () => {
  describe('POST /sessions/:id/finish', () => {
    it('should set completed_at and update audio_files.duration_ms', async () => {
      // Create a session first
      const createResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Finish Test Session'
        })
      })

      const sessionData = await createResponse.json() as { sessionId: string }
      const sessionId = sessionData.sessionId

      // Call the finish endpoint
      const finishResponse = await fetch(`http://localhost:${TEST_PORT}/api/session/${sessionId}/finish`, {
        method: 'POST'
      })

      expect(finishResponse.status).toBe(200)
      const finishData = await finishResponse.json() as { status: string; completedAt: string }
      expect(finishData.status).toBe('success')
      expect(finishData.completedAt).toBeDefined()

      // Verify session status and completed_at are set
      const updatedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      expect(updatedSession[0]?.status).toBe('completed')
      expect(updatedSession[0]?.completedAt).toBeDefined()
      expect(updatedSession[0]?.completedAt).toBeGreaterThan(0)

      // Verify audio_files.duration is calculated and set
      // This will fail until duration calculation is implemented
      const audioFilesResult = await db
        .select()
        .from(audioFiles)
        .where(eq(audioFiles.sessionId, sessionId))

      expect(audioFilesResult).toHaveLength(2) // human and ai tracks

      // Both files should have duration calculated (even if 0 for empty files)
      for (const file of audioFilesResult) {
        expect(file.duration).toBeDefined() // This will fail until duration is calculated
        expect(typeof file.duration).toBe('number') // This will fail until duration is calculated
      }
    })
  })
})