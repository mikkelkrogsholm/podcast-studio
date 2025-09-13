import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../server.js'
import { readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { runMigrations } from '../db/migrate.js'
import { db } from '../db/index.js'
import { audioFiles } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

const TEST_PORT = 4399 // Different port for route tests to avoid conflicts
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

beforeEach(() => {
  // Clean up any test session files
  const testSessionPath = join(process.cwd(), 'sessions', 'test-dual-session')
  if (existsSync(testSessionPath)) {
    rmSync(testSessionPath, { recursive: true })
  }
})

describe('Dual Track Audio Recording (Step 4)', () => {
  it('should create audio_files entries for both mikkel and freja tracks', async () => {
    // First create a session
    const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Dual Track Test Session'
      })
    })
    
    expect(sessionResponse.status).toBe(200)
    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.sessionId
    
    // Verify both mikkel and freja audio_files entries were created
    expect(sessionData).toHaveProperty('mikkelAudioFile')
    expect(sessionData).toHaveProperty('frejaAudioFile') // This will fail until implemented
    expect(sessionData.mikkelAudioFile).toContain('mikkel.wav')
    expect(sessionData.frejaAudioFile).toContain('freja.wav')
  })
  
  it('should handle audio uploads for both speakers', async () => {
    // Create session
    const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Dual Upload Test'
      })
    })
    
    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.sessionId
    
    // Create fake audio chunks
    const mikkelChunk = new ArrayBuffer(1024)
    const frejaChunk = new ArrayBuffer(2048)
    
    // Upload mikkel chunk
    const mikkelUpload = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/mikkel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav'
      },
      body: mikkelChunk
    })
    
    expect(mikkelUpload.status).toBe(200)
    
    // Upload freja chunk - this will fail until endpoint supports freja
    const frejaUpload = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/freja`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav'
      },
      body: frejaChunk
    })
    
    expect(frejaUpload.status).toBe(200) // Will fail until implemented
    
    // Finalize both tracks
    const mikkelFinalize = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/mikkel/finalize`, {
      method: 'POST'
    })
    expect(mikkelFinalize.status).toBe(200)
    
    const frejaFinalize = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/freja/finalize`, {
      method: 'POST'
    })
    expect(frejaFinalize.status).toBe(200) // Will fail until implemented
    
    // Verify both files exist and have content
    const mikkelInfo = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/mikkel/info`)
    const mikkelData = await mikkelInfo.json()
    expect(mikkelData.size).toBeGreaterThan(44) // More than WAV header
    
    const frejaInfo = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/freja/info`)
    const frejaData = await frejaInfo.json()
    expect(frejaData.size).toBeGreaterThan(44) // Will fail until implemented
  })
  
  it('should update database with correct file sizes for both tracks', async () => {
    // Create session
    const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Database Update Test'
      })
    })
    
    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.sessionId
    
    // Upload and finalize mikkel track
    const mikkelChunk = new ArrayBuffer(512)
    await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/mikkel`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: mikkelChunk
    })
    
    await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/mikkel/finalize`, {
      method: 'POST'
    })
    
    // Upload and finalize freja track
    const frejaChunk = new ArrayBuffer(1024)
    await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/freja`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: frejaChunk
    })
    
    await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/freja/finalize`, {
      method: 'POST'
    })
    
    // Check database entries
    const audioFilesInDb = await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.sessionId, sessionId))
    
    expect(audioFilesInDb).toHaveLength(2) // Both mikkel and freja entries
    
    const mikkelFile = audioFilesInDb.find(f => f.speaker === 'mikkel')
    const frejaFile = audioFilesInDb.find(f => f.speaker === 'freja')
    
    expect(mikkelFile).toBeDefined()
    expect(mikkelFile?.size).toBeGreaterThan(0)
    
    expect(frejaFile).toBeDefined() // Will fail until implemented
    expect(frejaFile?.size).toBeGreaterThan(0) // Will fail until implemented
  })
})