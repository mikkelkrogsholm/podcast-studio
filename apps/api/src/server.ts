import express, { type Express } from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from './db/index.js'
import { sessions, audioFiles, messages } from './db/schema.js'
import { eq, and, asc } from 'drizzle-orm'
import dotenv from 'dotenv'
import { z } from 'zod'
// Temporarily define schemas inline until import issue is resolved
const CreateMessageRequestSchema = z.object({
  speaker: z.enum(['mikkel', 'freja']),
  text: z.string().min(1),
  ts_ms: z.number().min(0),
  raw_json: z.record(z.any()),
})

// Settings schema for Step 07 with defaults
const SettingsSchema = z.object({
  model: z.literal('gpt-4o-realtime-preview').default('gpt-4o-realtime-preview'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  temperature: z.number().min(0.0).max(1.0).default(0.8),
  top_p: z.number().min(0.0).max(1.0).default(1.0),
  language: z.enum(['da-DK', 'en-US']).default('da-DK'),
  silence_ms: z.number().positive().default(900),
})

const CreateSessionRequestSchema = z.object({
  title: z.string(),
  settings: SettingsSchema.optional(),
})

// MessageResponseSchema not needed - using direct response objects

// GetMessagesResponseSchema not needed - using inline validation

// Load environment variables from .env file in project root
dotenv.config({ path: path.join(process.cwd(), '../../.env') })

export const app: Express = express()
export const PORT = 4201

app.use(cors())
app.use(express.json())

// Get OpenAI API key from environment
const OPENAI_API_KEY = process.env['OPENAI_API_KEY']

// Zod validation schemas
const keepaliveSchema = z.object({
  timestamp: z.number().optional()
})

const checkTimeoutsSchema = z.object({
  timeoutMs: z.number().min(1000).max(300000).optional().default(30000) // Default 30 seconds
})

const sessionParamsSchema = z.object({
  id: z.string().min(1) // Accept any non-empty string, let database handle validation
})

// Constants
// Removed unused DEFAULT_TIMEOUT_MS constant

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Get ephemeral token for OpenAI Realtime API
app.post('/api/realtime/token', async (_req, res) => {
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
    return res.json(data)
  } catch (error) {
    console.error('Failed to get OpenAI token:', error)
    return res.status(500).json({ error: 'Failed to get OpenAI token' })
  }
})

// Create a new session
app.post('/api/session', async (req, res) => {
  try {
    // Validate request body
    const bodyResult = CreateSessionRequestSchema.safeParse(req.body)
    if (!bodyResult.success) {
      // Extract field names from validation errors for better error messages
      const fieldNames = bodyResult.error.errors.map(err => err.path.join('.')).join(', ')
      return res.status(400).json({ 
        error: `Invalid request body: ${fieldNames}`, 
        details: bodyResult.error.errors 
      })
    }

    const { title, settings } = bodyResult.data
    const sessionId = randomUUID()
    const now = Date.now()

    // Apply default settings if none provided, or merge with provided settings
    const finalSettings = settings ? settings : SettingsSchema.parse({})

    // Create session in database
    await db.insert(sessions).values({
      id: sessionId,
      title: title || 'New Recording Session',
      settings: JSON.stringify(finalSettings),
      status: 'active',
      lastHeartbeat: now, // Initialize heartbeat to creation time
      createdAt: now,
      updatedAt: now,
    })

    // Create sessions directory if it doesn't exist
    const sessionsDir = path.join(process.cwd(), 'sessions')
    const sessionDir = path.join(sessionsDir, sessionId)
    
    await fs.mkdir(sessionsDir, { recursive: true })
    await fs.mkdir(sessionDir, { recursive: true })

    // Create audio file entries for both speakers
    const mikkelAudioFileId = randomUUID()
    const frejaAudioFileId = randomUUID()
    const mikkelFilePath = path.join(sessionDir, 'mikkel.wav')
    const frejaFilePath = path.join(sessionDir, 'freja.wav')
    
    // Insert both audio file records
    await db.insert(audioFiles).values([
      {
        id: mikkelAudioFileId,
        sessionId,
        speaker: 'mikkel',
        filePath: mikkelFilePath,
        size: 0,
        format: 'wav',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: frejaAudioFileId,
        sessionId,
        speaker: 'freja',
        filePath: frejaFilePath,
        size: 0,
        format: 'wav',
        createdAt: now,
        updatedAt: now,
      }
    ])

    return res.json({ 
      sessionId,
      mikkelAudioFile: `sessions/${sessionId}/mikkel.wav`,
      frejaAudioFile: `sessions/${sessionId}/freja.wav`
    })
  } catch (error) {
    console.error('Failed to create session:', error)
    return res.status(500).json({ error: 'Failed to create session' })
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
      .where(
        and(
          eq(audioFiles.sessionId, sessionId),
          eq(audioFiles.speaker, speaker)
        )
      )

    return res.json({ 
      status: 'success',
      chunkSize: req.body.length,
      totalSize: stats.size
    })

  } catch (error) {
    console.error('Failed to upload audio chunk:', error)
    return res.status(500).json({ error: 'Failed to upload audio chunk' })
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
      .where(
        and(
          eq(audioFiles.sessionId, sessionId),
          eq(audioFiles.speaker, speaker)
        )
      )

    return res.json({
      status: 'finalized',
      size: finalWavData.length,
      format: 'wav'
    })

  } catch (error) {
    console.error('Failed to finalize audio file:', error)
    return res.status(500).json({ error: 'Failed to finalize audio file' })
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
      .where(
        and(
          eq(audioFiles.sessionId, sessionId),
          eq(audioFiles.speaker, speaker)
        )
      )
      .limit(1)

    if (audioFileEntry.length === 0) {
      return res.status(404).json({ error: 'Audio file not found' })
    }

    const audioFile = audioFileEntry[0]
    if (!audioFile) {
      return res.status(404).json({ error: 'Audio file not found' })
    }

    return res.json({
      size: audioFile.size || 0,
      format: audioFile.format || 'wav',
      duration: audioFile.duration || undefined
    })

  } catch (error) {
    console.error('Failed to get audio file info:', error)
    return res.status(500).json({ error: 'Failed to get audio file info' })
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

// POST /api/session/:id/keepalive - Update session's last_heartbeat timestamp
app.post('/api/session/:id/keepalive', async (req, res) => {
  try {
    // Validate params
    const paramsResult = sessionParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    // Validate body
    const bodyResult = keepaliveSchema.safeParse(req.body)
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.errors })
    }

    const { id } = paramsResult.data
    const { timestamp } = bodyResult.data

    // Use provided timestamp or current time
    const heartbeatTime = timestamp || Date.now()

    // Check if session exists
    const existingSession = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    if (existingSession.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = existingSession[0]
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Only allow heartbeats for active sessions
    if (session.status !== 'active') {
      return res.status(400).json({ error: `Session is not active (status: ${session.status})` })
    }

    // Update last heartbeat
    await db.update(sessions)
      .set({ 
        lastHeartbeat: heartbeatTime,
        updatedAt: Date.now()
      })
      .where(eq(sessions.id, id))

    return res.json({ 
      status: 'success',
      sessionId: id,
      lastHeartbeat: heartbeatTime
    })

  } catch (error) {
    console.error('Failed to update keepalive:', error)
    return res.status(500).json({ error: 'Failed to update keepalive' })
  }
})

// POST /api/session/check-timeouts - Mark sessions as 'incomplete' if no heartbeat for timeout period
app.post('/api/session/check-timeouts', async (req, res) => {
  try {
    // Validate body
    const bodyResult = checkTimeoutsSchema.safeParse(req.body)
    if (!bodyResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.errors })
    }

    const { timeoutMs } = bodyResult.data
    const cutoffTime = Date.now() - timeoutMs

    // Find active sessions that haven't sent heartbeat within timeout period
    // This includes sessions where lastHeartbeat is null (old sessions) or < cutoffTime
    const timedOutSessions = await db.select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))

    // Filter out sessions that are within the timeout window
    const actuallyTimedOut = timedOutSessions.filter(session => {
      if (!session.lastHeartbeat) {
        // If no lastHeartbeat, use createdAt as fallback
        return session.createdAt < cutoffTime
      }
      return session.lastHeartbeat < cutoffTime
    })

    // Mark them as incomplete
    if (actuallyTimedOut.length > 0) {
      for (const session of actuallyTimedOut) {
        await db.update(sessions)
          .set({ 
            status: 'incomplete',
            updatedAt: Date.now()
          })
          .where(eq(sessions.id, session.id))
      }
    }

    return res.json({
      status: 'success',
      checkedAt: Date.now(),
      timeoutMs,
      timedOutSessions: actuallyTimedOut.length,
      sessionIds: actuallyTimedOut.map(s => s.id)
    })

  } catch (error) {
    console.error('Failed to check timeouts:', error)
    return res.status(500).json({ error: 'Failed to check timeouts' })
  }
})

// POST /api/session/:id/finish - Mark session as 'completed'
app.post('/api/session/:id/finish', async (req, res) => {
  try {
    // Validate params
    const paramsResult = sessionParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    const { id } = paramsResult.data

    // Check if session exists
    const existingSession = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    if (existingSession.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = existingSession[0]
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Only allow finishing active or incomplete sessions
    if (session.status !== 'active' && session.status !== 'incomplete') {
      return res.status(400).json({ error: `Cannot finish session with status: ${session.status}` })
    }

    const now = Date.now()

    // Mark session as completed
    await db.update(sessions)
      .set({ 
        status: 'completed',
        completedAt: now,
        updatedAt: now
      })
      .where(eq(sessions.id, id))

    return res.json({
      status: 'success',
      sessionId: id,
      completedAt: now
    })

  } catch (error) {
    console.error('Failed to finish session:', error)
    return res.status(500).json({ error: 'Failed to finish session' })
  }
})

// GET /api/sessions - List all sessions with their status
app.get('/api/sessions', async (_req, res) => {
  try {
    const allSessions = await db.select().from(sessions)

    const sessionsWithInfo = allSessions.map(session => ({
      id: session.id,
      title: session.title,
      status: session.status,
      lastHeartbeat: session.lastHeartbeat,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    }))

    return res.json({
      sessions: sessionsWithInfo,
      total: sessionsWithInfo.length
    })

  } catch (error) {
    console.error('Failed to list sessions:', error)
    return res.status(500).json({ error: 'Failed to list sessions' })
  }
})

// GET /api/session/:id - Get session details including audio files
app.get('/api/session/:id', async (req, res) => {
  try {
    // Validate params
    const paramsResult = sessionParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    const { id } = paramsResult.data

    // Get session
    const sessionResult = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    if (sessionResult.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const session = sessionResult[0]
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get audio files for this session
    const audioFileResults = await db.select()
      .from(audioFiles)
      .where(eq(audioFiles.sessionId, id))

    const audioFilesInfo = audioFileResults.map(audioFile => ({
      id: audioFile.id,
      speaker: audioFile.speaker,
      filePath: audioFile.filePath,
      size: audioFile.size || 0,
      duration: audioFile.duration,
      format: audioFile.format,
      createdAt: audioFile.createdAt,
      updatedAt: audioFile.updatedAt
    }))

    // Parse settings if they exist
    let parsedSettings = null
    if (session.settings) {
      try {
        parsedSettings = JSON.parse(session.settings)
      } catch (error) {
        console.error('Failed to parse settings JSON:', error)
      }
    }

    return res.json({
      id: session.id,
      title: session.title,
      status: session.status,
      settings: parsedSettings,
      lastHeartbeat: session.lastHeartbeat,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      audioFiles: audioFilesInfo
    })

  } catch (error) {
    console.error('Failed to get session details:', error)
    return res.status(500).json({ error: 'Failed to get session details' })
  }
})

// POST /api/session/:id/message - Insert new message with Zod validation
app.post('/api/session/:id/message', async (req, res) => {
  try {
    // Validate session ID
    const paramsResult = sessionParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    const { id: sessionId } = paramsResult.data

    // Validate message payload
    const bodyResult = CreateMessageRequestSchema.safeParse(req.body)
    if (!bodyResult.success) {
      return res.status(400).json({ 
        error: 'Invalid message payload', 
        details: bodyResult.error.errors 
      })
    }

    const { speaker, text, ts_ms, raw_json } = bodyResult.data

    // Check if session exists
    const existingSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (existingSession.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const now = Date.now()

    // Insert message
    const result = await db.insert(messages).values({
      sessionId,
      speaker,
      text,
      tsMs: ts_ms,
      rawJson: JSON.stringify(raw_json),
      createdAt: now,
    }).returning()

    const insertedMessage = result[0]
    if (!insertedMessage) {
      return res.status(500).json({ error: 'Failed to insert message' })
    }

    // Return formatted message response
    const response = {
      id: insertedMessage.id.toString(),
      sessionId: insertedMessage.sessionId,
      speaker: insertedMessage.speaker,
      text: insertedMessage.text,
      ts_ms: insertedMessage.tsMs,
      raw_json: JSON.parse(insertedMessage.rawJson),
      createdAt: insertedMessage.createdAt,
    }

    return res.json(response)

  } catch (error) {
    console.error('Failed to insert message:', error)
    return res.status(500).json({ error: 'Failed to insert message' })
  }
})

// GET /api/session/:id/messages - Get messages sorted by ts_ms
app.get('/api/session/:id/messages', async (req, res) => {
  try {
    // Validate session ID
    const paramsResult = sessionParamsSchema.safeParse(req.params)
    if (!paramsResult.success) {
      return res.status(400).json({ error: 'Invalid session ID format' })
    }

    const { id: sessionId } = paramsResult.data

    // Check if session exists
    const existingSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    if (existingSession.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get messages sorted by ts_ms
    const messageResults = await db.select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.tsMs))

    // Format messages for response
    const formattedMessages = messageResults.map(msg => ({
      id: msg.id.toString(),
      sessionId: msg.sessionId,
      speaker: msg.speaker,
      text: msg.text,
      ts_ms: msg.tsMs,
      raw_json: JSON.parse(msg.rawJson),
      createdAt: msg.createdAt,
    }))

    return res.json({ messages: formattedMessages })

  } catch (error) {
    console.error('Failed to get messages:', error)
    return res.status(500).json({ error: 'Failed to get messages' })
  }
})

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}