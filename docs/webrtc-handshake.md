# WebRTC Handshake with OpenAI Realtime API

## Overview
Establishes a real-time WebRTC connection between the browser client and OpenAI's Realtime API for low-latency audio streaming. The implementation uses ephemeral tokens for security and provides a mock connection fallback for development/testing.

## Primary Purpose
Enable bidirectional audio communication with OpenAI's GPT-4 Realtime model while maintaining security by never exposing API keys to the client.

## How It Works

### Connection Flow
1. User clicks "Connect" button in the UI
2. Frontend requests ephemeral token from backend (`POST /api/realtime/token`)
3. Backend fetches session token from OpenAI API
4. Frontend establishes WebRTC peer connection using token
5. Connection status updates displayed in real-time

### Security Model
- API keys stored only in backend environment variables
- Client receives short-lived ephemeral tokens (60 minute expiry)
- CORS configured to restrict cross-origin requests

### Mock Mode
When `OPENAI_API_KEY` is not configured:
- Backend returns 401 status
- Frontend falls back to mock connection
- Allows UI testing without OpenAI credentials

## Key Components

### Backend
**`apps/api/src/server.ts`**
- `POST /api/realtime/token` - Mints ephemeral session tokens
- Handles CORS for cross-origin requests
- Returns 401 when API key missing

### Frontend
**`apps/web/src/hooks/useRealtimeConnection.ts`**
- React hook managing WebRTC connection lifecycle
- Handles connection states: disconnected → connecting → connected/error
- Manages cleanup on component unmount
- Provides event logging for debugging

**`apps/web/src/app/page.tsx`**
- Connect button with dynamic state display
- Event log panel showing connection history
- Button disabled when connecting/connected

### Tests
**`apps/api/tests/openai.test.ts`**
- API smoke test for OpenAI connectivity (@live tag)
- Skips when OPENAI_API_KEY not present

**`apps/web/e2e/connection.spec.ts`**
- Playwright E2E test for connection flow
- Verifies button text changes to "Connected"
- Ensures button becomes disabled after connection

## Configuration

### Environment Variables
```bash
# Backend only (.env)
OPENAI_API_KEY=sk-proj-...
```

### Ports
- Web Frontend: `http://localhost:4200`
- API Backend: `http://localhost:4201`

## WebRTC Details

### Peer Connection Setup
- Creates data channel `oai-events` for bidirectional events
- Adds local microphone track (prepared for Step 03)
- Handles remote audio track (prepared for Step 04)

### Connection States
- `disconnected` - Initial state, no connection
- `connecting` - Token fetch, WebRTC negotiation in progress
- `connected` - Active WebRTC session established
- `error` - Connection failed or lost

## Error Handling
- Network failures gracefully fall back to error state
- Connection cleanup automatically triggered on errors
- All errors logged to event panel with timestamps

## Testing

### Unit Tests
```bash
pnpm test:api  # Run backend tests
```

### E2E Tests
```bash
pnpm test:e2e  # Run Playwright tests
```

Both servers must be running for E2E tests:
```bash
pnpm dev:api  # Terminal 1
pnpm dev:web  # Terminal 2
```

## Next Steps
- Step 03: Capture local microphone and upload audio chunks
- Step 04: Capture AI audio output as separate track
- Step 05: Implement auto-save and crash recovery