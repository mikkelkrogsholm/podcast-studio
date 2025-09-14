import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title'),
  status: text('status').default('pending'), // 'pending', 'active', 'incomplete', 'completed'
  settings: text('settings'), // JSON string of settings for Step 07
  personaPrompt: text('persona_prompt').default(''), // Persona prompt for AI character (max 5000 chars)
  contextPrompt: text('context_prompt').default(''), // Context prompt for session topic (max 5000 chars)
  recordingSegment: integer('recording_segment').default(1), // Current recording segment for resume functionality
  lastHeartbeat: integer('last_heartbeat'), // timestamp of last keepalive
  completedAt: integer('completed_at'), // timestamp when session was finished
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const audioFiles = sqliteTable('audio_files', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  speaker: text('speaker').notNull(), // 'mikkel' or 'freja'
  filePath: text('file_path').notNull(),
  segmentNumber: integer('segment_number').default(1), // Segment number for resume functionality
  size: integer('size').default(0),
  duration: integer('duration'), // in seconds
  format: text('format').default('wav'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  speaker: text('speaker').notNull(), // 'mikkel' or 'freja'
  text: text('text').notNull(), // the transcript text
  tsMs: integer('ts_ms').notNull(), // timestamp in milliseconds
  rawJson: text('raw_json').notNull(), // raw event JSON
  createdAt: integer('created_at').notNull(),
})