# Step 06: Live Transcript Display and Persistence

## Overview
This feature implements real-time transcript display and database persistence for the podcast studio application. It captures and stores conversation messages between Mikkel (human host) and Freja (AI co-host) during recording sessions.

## Primary Purpose
- Display live transcripts during recording sessions
- Persist transcript messages to database for later retrieval
- Support session recovery with transcript history
- Enable bilingual (Danish/English) display of all UI elements

## Implementation Details

### Database Schema
Added `messages` table to store transcript events:
```typescript
// apps/api/src/db/schema.ts
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  speaker: text('speaker').notNull(), // 'mikkel' or 'freja'
  text: text('text').notNull(),
  tsMs: integer('ts_ms').notNull(),
  rawJson: text('raw_json').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(strftime('%s', 'now') * 1000)`),
})
```

### API Endpoints
Two new endpoints for message persistence:

1. **POST /api/session/:id/message**
   - Stores a single transcript message
   - Validates payload with Zod schema
   - Returns 404 if session doesn't exist

2. **GET /api/session/:id/messages**
   - Retrieves all messages for a session
   - Returns messages sorted by timestamp (ascending)
   - Preserves raw JSON for debugging

### Frontend Components

#### Transcript Component (`apps/web/src/components/Transcript.tsx`)
- Displays live transcript messages with speaker labels
- Auto-scrolls to latest message
- Color-coded by speaker (blue for Mikkel, green for Freja)
- Shows timestamps for each message
- Fully internationalized with Danish/English support

#### WebSocket Integration (`apps/web/src/hooks/useRealtimeConnection.ts`)
- Listens for transcript events from OpenAI Realtime API
- Processes both input and response audio transcripts
- Maintains transcript message state
- Sends messages to backend for persistence

### Internationalization Support
Complete i18n implementation across all components:
- Language context provider with Danish/English translations
- All hardcoded strings replaced with translation keys
- Dynamic language switching via UI buttons
- Comprehensive translations for:
  - Audio recording controls
  - Connection status messages
  - Session recovery UI
  - Transcript display
  - Alert messages

## Key Files

### Backend
- `apps/api/src/db/schema.ts` - Database schema with messages table
- `apps/api/src/server.ts` - Message persistence endpoints
- `apps/api/src/routes/messages.test.ts` - TDD test suite

### Frontend
- `apps/web/src/components/Transcript.tsx` - Live transcript display
- `apps/web/src/contexts/LanguageContext.tsx` - i18n provider
- `apps/web/src/hooks/useRealtimeConnection.ts` - WebSocket event handling
- `apps/web/src/app/page.tsx` - Main UI with language switcher

## Testing
Comprehensive test coverage following TDD approach:
- Message insertion with Zod validation
- Retrieval sorted by timestamp
- Error handling for invalid payloads
- Session existence validation
- Foreign key constraint testing

## Usage
1. Start recording session
2. Speak into microphone - transcripts appear live
3. AI responses are transcribed and displayed
4. All messages are persisted to database
5. Switch between Danish/English using language buttons
6. Resume sessions to see historical transcripts

## Technical Decisions
- SQLite with Drizzle ORM for persistence
- Zod for runtime validation
- React Context for i18n state management
- WebSocket for real-time updates
- Color-coded UI for speaker differentiation