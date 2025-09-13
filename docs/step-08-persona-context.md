# Step 08: Persona and Context Prompts

## Overview
This feature allows users to customize the AI co-host (Freja) with specific persona characteristics and conversation context before starting a recording session. The prompts are locked during recording to maintain consistency throughout the conversation.

## Primary Purpose
- Enable customization of AI personality and behavior
- Set conversation context and topics
- Ensure consistent AI responses throughout a recording session
- Support multiple languages and personas (Danish/English)

## How It Operates

### 1. Settings Configuration
Users configure two types of prompts in the Settings form:
- **Persona Prompt**: Defines Freja's personality, speaking style, and characteristics
- **Context Prompt**: Sets the conversation topic and context

### 2. WebRTC Integration
When connecting to OpenAI Realtime API:
1. Settings (including prompts) are passed to `useRealtimeConnection` hook
2. The hook builds AI instructions from persona and context prompts
3. Instructions are sent via WebRTC data channel in session configuration
4. OpenAI uses these instructions throughout the conversation

### 3. Session Persistence
- Prompts are saved with each recording session in the database
- Settings are locked during recording (UI becomes read-only)
- Prompts persist in localStorage for convenience

## Important Files and Components

### Frontend Components
- **apps/web/src/components/SettingsForm.tsx**
  - Added persona_prompt and context_prompt textarea fields
  - Character counter (max 5000 chars)
  - Locked state indicator during recording
  - Updated voice options: cedar, marin, ash, ballad, coral, sage, verse, alloy
  - Updated model options: gpt-realtime, gpt-4o-realtime-preview

- **apps/web/src/hooks/useRealtimeConnection.ts**
  - Modified to accept settings parameter
  - Builds AI instructions from persona/context prompts
  - Configures session with custom voice and silence_ms

- **apps/web/src/app/page.tsx**
  - Passes currentSettings to connect() function
  - Ensures settings are available before connection

### Backend Implementation
- **apps/api/src/server.ts**
  - Updated session creation to accept and store prompts
  - Validates prompts with Zod (max 5000 chars)
  - Stores prompts in database with session

- **apps/api/src/db/schema.ts**
  - Added persona_prompt and context_prompt columns to sessions table
  - Both fields are text type, nullable

### Shared Types
- **packages/shared/src/index.ts**
  - Updated SettingsSchema with persona_prompt and context_prompt
  - Updated voice enum with 2025 Realtime API voices
  - Updated model enum with gpt-realtime option

## Key Features

### Character Validation
- Maximum 5000 characters per prompt
- Real-time character counting
- Color-coded warnings (yellow at 4000, red at 4500)
- Validation errors displayed inline

### Voice Options (September 2025)
```typescript
voice: z.enum(['cedar', 'marin', 'ash', 'ballad', 'coral', 'sage', 'verse', 'alloy'])
```

### Model Options
```typescript
model: z.enum(['gpt-realtime', 'gpt-4o-realtime-preview'])
```
Note: Temperature control not supported in gpt-realtime model

### Locked During Recording
- All settings become read-only when recording starts
- "Persona låst" badge appears on locked fields
- Ensures consistency throughout the session

## Testing

### Unit Tests
- **apps/api/src/routes/session.test.ts**
  - Tests persona/context persistence
  - Validates 5000 character limit
  - Ensures exact string storage

### E2E Tests
- **apps/web/e2e/step-08-persona-context.spec.ts**
  - Tests UI field presence and functionality
  - Validates character counting
  - Tests locked state during recording

### Live Testing Guide
- **test-persona-live.md**
  - Three test scenarios: Danish, Technical, Casual personas
  - Verification checklist for all features

## Example Usage

### Danish Podcast Host
```
Persona: "Du er Freja, en dansk AI podcast vært. Tal kun dansk, vær varm og imødekommende."
Context: "Vi diskuterer i dag fremtiden for AI i Danmark."
```

### Technical Expert
```
Persona: "You are Freja, an AI expert specializing in machine learning. Use technical terminology."
Context: "We're discussing transformer architectures and their applications."
```

### Casual Host
```
Persona: "You are Freja, a super casual and fun podcast host. Make jokes and keep things light."
Context: "We're having a fun chat about weird tech gadgets of 2025."
```

## Migration
Run database migration to add persona/context columns:
```bash
pnpm db:migrate
```

## Dependencies
- Zod for validation
- React hooks for state management
- SQLite/Drizzle for persistence
- OpenAI Realtime API for AI responses