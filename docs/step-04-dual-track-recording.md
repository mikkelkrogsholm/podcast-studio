# Step 4: Dual-Track Voice Recording with OpenAI Realtime API

## Overview
This feature implements bidirectional voice conversation with OpenAI's Realtime API, capturing both the host (Mikkel) and AI co-host (Freja) audio as separate tracks for post-production flexibility.

## Primary Purpose
Enable real-time voice conversations between a human podcast host and an AI co-host, with professional dual-track recording capabilities for podcast production.

## How It Works

### 1. Voice Conversation Flow
```
User speaks → WebRTC → OpenAI Realtime API → AI responds → WebRTC → User hears response
     ↓                                              ↓
  Mikkel.wav                                    Freja.wav
```

### 2. Key Features
- **Bidirectional Voice Communication**: Real-time speech-to-speech using OpenAI's native voice model
- **Voice Activity Detection (VAD)**: Server-side detection with 500ms silence threshold for natural turn-taking
- **Dual-Track Recording**: Simultaneous capture of both speakers as separate WAV files
- **Auto-save**: Audio chunks uploaded every second to prevent data loss
- **Visual Feedback**: Real-time volume indicators for both tracks with mute controls

## Technical Implementation

### Frontend Components

#### `/apps/web/src/hooks/useRealtimeConnection.ts`
Manages WebRTC connection to OpenAI Realtime API:
- Establishes peer connection with ephemeral token authentication
- Configures session for voice mode with VAD
- Handles bidirectional audio streaming
- Sends initial greeting prompt to AI

#### `/apps/web/src/hooks/useDualTrackRecording.ts`
Handles dual-track audio recording:
- Captures local microphone (Mikkel track)
- Records remote AI audio (Freja track)
- Uses Web Audio API for routing and monitoring
- Uploads chunks every second to backend
- Provides volume level monitoring

#### `/apps/web/src/components/VolumeIndicator.tsx`
Visual audio level display:
- 10-segment volume meter
- Color-coded levels (green → yellow → red)
- Integrated mute button
- Real-time updates (10Hz)

#### `/apps/web/src/components/DualTrackControls.tsx`
Container for audio controls:
- Displays both Mikkel and Freja volume indicators
- Individual mute controls for each track
- Recording status display

### Backend Implementation

#### `/apps/api/src/server.ts`
Enhanced session creation:
- Creates audio file records for both speakers
- Returns `mikkelAudioFile` and `frejaAudioFile` properties
- Batch insert for efficiency

#### `/apps/api/src/routes/audio.test.ts`
Test coverage for dual-track functionality:
- Verifies both audio files are created
- Tests upload endpoints for both speakers
- Validates database record creation

### E2E Tests

#### `/apps/web/e2e/step-04-freja-track.spec.ts`
End-to-end test for AI audio capture:
- Simulates recording session
- Verifies both audio files exist
- Handles multi-language UI support

## Configuration

### OpenAI Realtime API Settings
```javascript
{
  modalities: ['audio', 'text'],
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    silence_duration_ms: 500
  }
}
```

### Audio Recording Format
- **Format**: PCM in WebM container
- **Sample Rate**: 48kHz mono
- **Chunk Duration**: 1 second
- **Storage**: `sessions/{sessionId}/{speaker}.wav`

## Usage Instructions

1. **Connect to OpenAI**: Click "Connect" button and wait for green status
2. **Start Recording**: Click "Start Recording" (requires active connection)
3. **Have Conversation**: Speak naturally - VAD handles turn-taking automatically
4. **Monitor Levels**: Watch volume indicators for both tracks
5. **Stop Recording**: Click "Stop Recording" to finalize session

## File Storage

Audio files are stored in:
```
/apps/api/sessions/{sessionId}/
├── mikkel.wav   # Host audio track
└── freja.wav    # AI audio track
```

## Dependencies
- OpenAI Realtime API (gpt-4o-realtime-preview)
- WebRTC for low-latency streaming
- MediaRecorder API for audio capture
- Web Audio API for routing and monitoring

## Security Considerations
- API key only stored in backend (.env)
- Ephemeral tokens for client connections
- Token expires after short duration
- No sensitive data in client code

## Known Limitations
- Maximum session length: 30 minutes (OpenAI limit)
- MediaRecorder may have compatibility issues in some test environments
- Requires modern browser with WebRTC support
- Audio quality dependent on network conditions

## Testing
```bash
# Run API tests
cd apps/api && pnpm test

# Run E2E tests (requires running servers)
cd apps/web && pnpm test:e2e --grep "step-04"
```

## Future Enhancements
- Add support for multiple AI voices
- Implement noise suppression
- Add real-time transcription display
- Support for pause/resume functionality
- Export to different audio formats