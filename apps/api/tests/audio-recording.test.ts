import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'http'
import { app } from '../src/server.js'
import { readFileSync, rmSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { runMigrations } from '../src/db/migrate.js'

const TEST_PORT = 4298 // Different port for audio tests
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
  const testSessionPath = join(process.cwd(), 'sessions', 'test-session-123')
  if (existsSync(testSessionPath)) {
    rmSync(testSessionPath, { recursive: true })
  }
})

describe('POST /api/session', () => {
  it('should create session with audio_files entry for human', async () => {
    // This test will fail until the endpoint is implemented
    const response = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Recording Session'
      })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data).toHaveProperty('sessionId')
    expect(data).toHaveProperty('mikkelAudioFile')
    // Backward-compatibility property exists, but path may be canonical
    // We accept either legacy or canonical file name in response
    expect(data.mikkelAudioFile.includes('mikkel.wav') || data.mikkelAudioFile.includes('human.wav')).toBe(true)
  })
})

describe('Audio chunk upload and WAV finalization', () => {
  it('should append audio chunks and finalize WAV header', async () => {
    // First create a session
    const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Chunk Test Session'
      })
    })
    
    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.sessionId
    
    // Create fake audio chunk data (minimal PCM16 data)
    const chunk1 = new ArrayBuffer(1024)
    const chunk2 = new ArrayBuffer(512)
    
    // Upload first chunk - this will fail until endpoint is implemented  
    const upload1 = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/human`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav'
      },
      body: chunk1
    })
    
    expect(upload1.status).toBe(200)
    
    // Upload second chunk
    const upload2 = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/human`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav'  
      },
      body: chunk2
    })
    
    expect(upload2.status).toBe(200)
    
    // Finalize the recording
    const finalizeResponse = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/human/finalize`, {
      method: 'POST'
    })
    
    expect(finalizeResponse.status).toBe(200)
    
    // Verify the file exists and has correct WAV structure
    const audioFilePath = join(process.cwd(), 'sessions', sessionId, 'human.wav')
    expect(existsSync(audioFilePath)).toBe(true)
    
    const fileStats = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/human/info`)
    const statsData = await fileStats.json()
    
    expect(statsData.size).toBeGreaterThan(44) // Larger than WAV header
    expect(statsData.format).toBe('wav')
    
    // Verify WAV file structure
    const buffer = readFileSync(audioFilePath)
    
    // Check RIFF header
    expect(buffer.subarray(0, 4).toString()).toBe('RIFF')
    expect(buffer.subarray(8, 12).toString()).toBe('WAVE')
    
    // Check fmt chunk
    expect(buffer.subarray(12, 16).toString()).toBe('fmt ')
    
    // Verify file size matches header
    const fileSizeInHeader = buffer.readUInt32LE(4)
    expect(fileSizeInHeader).toBe(buffer.length - 8)
  })
  
  it('should handle empty session gracefully', async () => {
    // This test ensures we handle edge cases properly
    const sessionResponse = await fetch(`http://localhost:${TEST_PORT}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Empty Session Test'
      })
    })
    
    const sessionData = await sessionResponse.json()
    const sessionId = sessionData.sessionId
    
    // Try to finalize without uploading any chunks
    const finalizeResponse = await fetch(`http://localhost:${TEST_PORT}/api/audio/${sessionId}/human/finalize`, {
      method: 'POST'
    })
    
    // Should still create a valid (empty) WAV file
    expect(finalizeResponse.status).toBe(200)
    
    const audioFilePath = join(process.cwd(), 'sessions', sessionId, 'human.wav')
    expect(existsSync(audioFilePath)).toBe(true)
    
    // Should be a minimal valid WAV file (just headers)
    const buffer = readFileSync(audioFilePath)
    expect(buffer.length).toBe(44) // Standard WAV header size
    expect(buffer.subarray(0, 4).toString()).toBe('RIFF')
  })
})
