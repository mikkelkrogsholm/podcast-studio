import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from './db/index.js'
import { sessions, audioFiles } from './db/schema.js'
import { eq } from 'drizzle-orm'

export const app = express()
export const PORT = 4201

app.use(cors())
app.use(express.json())

// Get OpenAI API key from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// Get ephemeral token for OpenAI Realtime API
app.post('/api/realtime/token', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured in environment' })
    }

    // Create ephemeral token with OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'shimmer',
        instructions: 'You are a helpful AI assistant in a podcast studio.'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return res.status(response.status).json({ error: 'Failed to create session with OpenAI' })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Failed to get OpenAI token:', error)
    res.status(500).json({ error: 'Failed to get OpenAI token' })
  }
})

// Create a new session
app.post('/api/session', async (req, res) => {
  try {
    const sessionId = randomUUID()
    const now = Date.now()

    // Create session in database
    await db.insert(sessions).values({
      id: sessionId,
      title: req.body.title || 'New Recording Session',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    // Create sessions directory if it doesn't exist
    const sessionsDir = path.join(process.cwd(), 'sessions')
    const sessionDir = path.join(sessionsDir, sessionId)
    
    await fs.mkdir(sessionsDir, { recursive: true })
    await fs.mkdir(sessionDir, { recursive: true })

    // Create audio file entry for mikkel
    const mikkelAudioFileId = randomUUID()
    const mikkelFilePath = path.join(sessionDir, 'mikkel.wav')
    
    await db.insert(audioFiles).values({
      id: mikkelAudioFileId,
      sessionId,
      speaker: 'mikkel',
      filePath: mikkelFilePath,
      size: 0,
      format: 'wav',
      createdAt: now,
      updatedAt: now,
    })

    res.json({ 
      sessionId,
      mikkelAudioFile: `sessions/${sessionId}/mikkel.wav`
    })
  } catch (error) {
    console.error('Failed to create session:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// Upload audio chunk (raw binary data)
app.post('/api/audio/:sessionId/:speaker', express.raw({ type: 'audio/wav', limit: '10mb' }), async (req, res) => {
  try {
    const { sessionId, speaker } = req.params
    
    if (!req.body || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'No audio data provided' })
    }

    if (speaker !== 'mikkel' && speaker !== 'freja') {
      return res.status(400).json({ error: 'Invalid speaker. Must be "mikkel" or "freja"' })
    }

    // Verify session exists
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionDir = path.join(process.cwd(), 'sessions', sessionId)
    const audioFilePath = path.join(sessionDir, `${speaker}.wav`)

    // Append chunk to file
    await fs.appendFile(audioFilePath, req.body)

    // Update file size in database
    const stats = await fs.stat(audioFilePath)
    const now = Date.now()
    
    await db.update(audioFiles)
      .set({ 
        size: stats.size,
        updatedAt: now 
      })
      .where(eq(audioFiles.sessionId, sessionId))
      .where(eq(audioFiles.speaker, speaker))

    res.json({ 
      status: 'success',
      chunkSize: req.body.length,
      totalSize: stats.size
    })

  } catch (error) {
    console.error('Failed to upload audio chunk:', error)
    res.status(500).json({ error: 'Failed to upload audio chunk' })
  }
})

// Finalize audio file - write proper WAV header
app.post('/api/audio/:sessionId/:speaker/finalize', async (req, res) => {
  try {
    const { sessionId, speaker } = req.params

    if (speaker !== 'mikkel' && speaker !== 'freja') {
      return res.status(400).json({ error: 'Invalid speaker. Must be "mikkel" or "freja"' })
    }

    // Verify session exists
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionDir = path.join(process.cwd(), 'sessions', sessionId)
    const audioFilePath = path.join(sessionDir, `${speaker}.wav`)

    // Read the current raw audio data
    let audioData: Buffer
    try {
      audioData = await fs.readFile(audioFilePath)
    } catch (error) {
      // If file doesn't exist, create empty audio data
      audioData = Buffer.alloc(0)
    }

    // Create proper WAV header
    const wavHeader = createWavHeader(audioData.length)
    const finalWavData = Buffer.concat([wavHeader, audioData])

    // Write back the complete WAV file
    await fs.writeFile(audioFilePath, finalWavData)

    // Update database with final file info
    const now = Date.now()
    await db.update(audioFiles)
      .set({
        size: finalWavData.length,
        updatedAt: now
      })
      .where(eq(audioFiles.sessionId, sessionId))
      .where(eq(audioFiles.speaker, speaker))

    res.json({
      status: 'finalized',
      size: finalWavData.length,
      format: 'wav'
    })

  } catch (error) {
    console.error('Failed to finalize audio file:', error)
    res.status(500).json({ error: 'Failed to finalize audio file' })
  }
})

// Get audio file info
app.get('/api/audio/:sessionId/:speaker/info', async (req, res) => {
  try {
    const { sessionId, speaker } = req.params

    if (speaker !== 'mikkel' && speaker !== 'freja') {
      return res.status(400).json({ error: 'Invalid speaker. Must be "mikkel" or "freja"' })
    }

    // Get audio file from database
    const audioFileEntry = await db.select()
      .from(audioFiles)
      .where(eq(audioFiles.sessionId, sessionId))
      .where(eq(audioFiles.speaker, speaker))
      .limit(1)

    if (audioFileEntry.length === 0) {
      return res.status(404).json({ error: 'Audio file not found' })
    }

    const audioFile = audioFileEntry[0]

    res.json({
      size: audioFile.size || 0,
      format: audioFile.format || 'wav',
      duration: audioFile.duration || undefined
    })

  } catch (error) {
    console.error('Failed to get audio file info:', error)
    res.status(500).json({ error: 'Failed to get audio file info' })
  }
})

// Helper function to create WAV header
function createWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44)
  const totalLength = dataLength + 44

  // RIFF header
  header.write('RIFF', 0)
  header.writeUInt32LE(totalLength - 8, 4)
  header.write('WAVE', 8)

  // fmt chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // chunk size
  header.writeUInt16LE(1, 20)  // audio format (PCM)
  header.writeUInt16LE(1, 22)  // number of channels (mono)
  header.writeUInt32LE(48000, 24) // sample rate
  header.writeUInt32LE(96000, 28) // byte rate (48000 * 1 * 2)
  header.writeUInt16LE(2, 32)  // block align
  header.writeUInt16LE(16, 34) // bits per sample

  // data chunk
  header.write('data', 36)
  header.writeUInt32LE(dataLength, 40)

  return header
}

// Token endpoint for OpenAI Realtime API
app.post('/api/realtime/token', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(401).json({ 
      error: 'OPENAI_API_KEY environment variable is required' 
    })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy'
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text())
      return res.status(response.status).json({ error: 'Failed to create session' })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Token endpoint error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}