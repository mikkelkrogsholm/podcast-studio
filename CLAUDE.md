# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based podcast studio built on OpenAI's Realtime API, designed for conducting live two-way conversations between a human host (Mikkel) and an AI co-host (Freja). The system records two separate audio tracks for post-production flexibility.

## Architecture

### Monorepo Structure
- **apps/web**: Next.js/React frontend for UI and audio capture
- **apps/api**: Node.js/TypeScript backend for OpenAI proxy and data persistence  
- **packages/shared**: Shared TypeScript types and Zod utilities

### Core Technologies
- **Frontend**: Next.js, React, TypeScript (strict mode)
- **Backend**: Node/Express or Next API routes, TypeScript
- **Database**: SQLite with Drizzle ORM
- **Audio**: WebRTC for low-latency streaming, MediaRecorder API for dual-track recording
- **API**: OpenAI Realtime API with WebRTC/WebSocket connections

### Data Flow
1. Frontend captures local microphone (Mikkel track) via MediaDevices API
2. WebRTC connection established to OpenAI Realtime API using ephemeral tokens
3. AI audio output (Freja track) captured separately via MediaStreamDestination
4. Both tracks uploaded in chunks to backend for persistence
5. Live transcripts displayed and saved to database

## Development Commands

```bash
# Install dependencies
pnpm install

# Development servers (run in parallel)
pnpm dev:api    # Start API server
pnpm dev:web    # Start web frontend

# Testing
pnpm test       # Run all tests
pnpm test:api   # Run API tests only  
pnpm test:web   # Run web tests only
pnpm test:e2e   # Run Playwright E2E tests

# Code quality
pnpm lint       # Run ESLint
pnpm typecheck  # Run TypeScript type checking
pnpm format     # Run Prettier

# Database
pnpm db:migrate # Run database migrations
pnpm db:seed    # Seed development data
```

## Implementation Steps (TDD Approach)

The project follows a 12-step incremental build plan (see context/steps/):

1. **Step 0**: Repository skeleton with basic tooling
2. **Step 1**: OpenAI connection and token generation
3. **Step 2**: WebRTC/WebSocket handshake
4. **Step 3**: Local microphone capture and upload
5. **Step 4**: AI audio output as separate track
6. **Step 5**: Auto-save and crash recovery
7. **Step 6**: Live transcript display and persistence
8. **Step 7**: Playground-style controls (model, voice, temperature)
9. **Step 8**: Persona and context prompts
10. **Step 9**: File download and export
11. **Step 10**: Session management (stop/retry/interrupt)
12. **Step 11**: Session history and details view
13. **Step 12**: Extension hooks for future features

## Key Implementation Details

### Audio Recording
- Two separate WAV tracks: mikkel.wav and freja.wav
- Format: PCM16, 48kHz, mono
- Chunks uploaded every 1-2 seconds for auto-save
- Files stored at: `sessions/{id}/{speaker}.wav`

### OpenAI Realtime Integration
- Backend mints short-lived session tokens (never expose API key to client)
- WebRTC preferred for lowest latency
- Server-side VAD with ~900ms default silence threshold
- Maximum session length: 30 minutes (OpenAI limit)

### Database Schema
- **sessions**: Stores session metadata, settings, and prompts
- **messages**: Transcript events with speaker, text, timestamp
- **audio_files**: References to audio file paths and metadata

### Testing Strategy
- TDD for API endpoints and database operations
- Manual testing for WebRTC/audio features requiring browser permissions
- Live tests (tagged @live) only run when OPENAI_API_KEY is set

## Agent-Specific Guidance

### audio-engineer Agent
Focus on frontend audio/WebRTC implementation. Key responsibilities:
- Set up dual-track recording (local mic + remote AI)
- Ensure low latency WebRTC connection
- Implement testable audio capture with fake-mic flag support

### test-writer Agent  
Write minimal tests first following TDD principles:
- Extract acceptance criteria from step files
- Create Vitest/Playwright test skeletons
- Run tests expecting failure, then guide implementation to green

### backend-surgeon Agent
Build precise API endpoints with validation:
- One route at a time following TDD
- Use Zod for request/response validation
- Clear 400/200 response scenarios
- No premature abstraction

## Security Considerations
- API keys only in backend environment variables
- Ephemeral tokens for client-side OpenAI connections
- CORS locked to application origin in production
- Structured logging without sensitive data

## Important Constraints
- **No over-engineering**: Build only what's needed for the current step
- **Persona/context locked per session**: Cannot be changed mid-recording
- **Auto-save everything**: Every chunk and event persisted immediately
- **Raw data first**: Store unprocessed audio and transcripts