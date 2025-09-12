# OpenAI Realtime API Integration

## Overview
This document describes the OpenAI Realtime API integration for the podcast studio, enabling real-time AI-powered conversations with WebRTC connectivity.

## Configuration

### Environment Setup
**File:** `.env`
```bash
OPENAI_API_KEY=sk-proj-xxx...  # Your OpenAI API key
```

The API key is loaded using dotenv in the backend server and is never exposed to the frontend.

## Architecture

### Security Model
1. **Backend** holds the OpenAI API key securely
2. **Frontend** requests ephemeral tokens from backend
3. **WebRTC** connection established directly between browser and OpenAI
4. **Ephemeral tokens** expire after ~60 seconds for security

### Connection Flow
```
Browser → Backend → OpenAI API → Ephemeral Token
   ↓                                    ↓
Browser ← WebRTC Connection ← OpenAI Realtime
```

## Implementation

### Backend Token Endpoint
**File:** `apps/api/src/server.ts`

```typescript
POST /api/realtime/token
```
- Creates ephemeral session with OpenAI
- Returns client_secret for WebRTC authentication
- Configures model, voice, and instructions

### Frontend Connection Hook
**File:** `apps/web/src/hooks/useRealtimeConnection.ts`

Key features:
- Manages WebRTC peer connection lifecycle
- Handles connection states (disconnected, connecting, connected, error)
- Creates data channel for events
- Manages audio streams (local microphone + remote AI)

### Connection States
- **disconnected** - Initial state, no active connection
- **connecting** - Fetching token, setting up WebRTC
- **connected** - Active WebRTC connection with OpenAI
- **error** - Connection failed or lost

## WebRTC Setup

### Offer/Answer Flow
1. Create RTCPeerConnection
2. Add local audio track (microphone)
3. Create data channel for events
4. Generate SDP offer
5. Send offer to OpenAI with ephemeral token
6. Receive SDP answer
7. Set remote description
8. Connection established

### Data Channel
- Name: `oai-events`
- Purpose: Bidirectional event communication
- Events: transcripts, function calls, interruptions

## UI Features

### Connection Controls
- **Connect Button** - Initiates connection to OpenAI
- **Disconnect Button** - Terminates active connection
- **Status Display** - Shows current connection state
- **Event Log** - Displays connection events with timestamps

### Visual States
- Blue button - Ready to connect
- Yellow button - Connecting in progress
- Green button - Successfully connected
- Red button - Error state

## Error Handling

### Common Issues
1. **Missing API Key**
   - Error: "OPENAI_API_KEY not configured in environment"
   - Solution: Add valid API key to .env file

2. **Invalid API Key**
   - Error: "Failed to create session with OpenAI"
   - Solution: Verify API key is correct and has access to Realtime API

3. **Microphone Permission**
   - Error: "NotAllowedError: Permission denied"
   - Solution: Grant microphone access in browser

4. **Network Issues**
   - Error: "Token request failed"
   - Solution: Check network connectivity and firewall settings

## OpenAI Configuration

### Default Settings
```javascript
{
  model: 'gpt-4o-realtime-preview-2024-12-17',
  voice: 'shimmer',
  instructions: 'You are a helpful AI assistant in a podcast studio.',
  modalities: ['audio', 'text'],
  output_audio_format: 'pcm16',
  input_audio_format: 'pcm16',
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    silence_duration_ms: 200
  }
}
```

### Available Voices
- shimmer (default)
- alloy
- echo
- fable
- onyx
- nova

## Testing

### Manual Testing
1. Ensure API server is running (`pnpm dev:api`)
2. Ensure web server is running (`pnpm dev:web`)
3. Navigate to http://localhost:4200
4. Click "Forbind" (Connect) button
5. Grant microphone permission
6. Verify "Forbundet" (Connected) status

### Automated Testing
- API endpoint tests in `apps/api/tests/`
- E2E connection tests in `apps/web/e2e/`

## Troubleshooting

### Check API Key Loading
```bash
# Backend should show this on startup:
[dotenv@17.2.2] injecting env (3) from ../../.env
```

### Test Token Endpoint
```bash
curl -X POST http://localhost:4201/api/realtime/token \
  -H "Content-Type: application/json" | jq
```

### Verify WebRTC Connection
- Open browser developer console
- Look for "Connection state: connected"
- Check for data channel "open" event

## Future Enhancements
- Configurable AI personality/instructions
- Model selection UI
- Voice selection dropdown
- Temperature and parameter controls
- Session recording and playback
- Transcript display in real-time