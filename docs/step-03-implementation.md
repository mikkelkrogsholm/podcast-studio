# Step 03 Implementation - Local Microphone Capture & Upload

## Overview
This document covers the implementation of Step 3 from the podcast-studio project, which adds local microphone capture functionality with real-time chunked upload to the backend. This forms the foundation for recording the host's (Mikkel's) audio track.

## Features Implemented

### 1. Audio Recording Infrastructure

#### Frontend Components
- **useAudioRecording Hook** (`apps/web/src/hooks/useAudioRecording.ts`)
  - Manages MediaRecorder API for browser-based audio capture
  - Captures audio at 48kHz, mono channel
  - Implements chunked upload every 1-2 seconds for auto-save
  - Handles microphone permissions and error states
  - Provides recording status and duration tracking

#### Backend Endpoints
- **POST /api/session** - Creates new recording session with unique ID
- **POST /api/audio/:sessionId/:speaker** - Accepts raw audio chunks
- **POST /api/audio/:sessionId/:speaker/finalize** - Finalizes WAV file with proper header
- **GET /api/audio/:sessionId/:speaker/info** - Returns file metadata

### 2. Database Schema
Added `audioFiles` table with:
- Session ID reference (foreign key)
- Speaker identification (mikkel/freja)
- File path, size, and duration tracking
- Audio format specifications (sample rate, channels, format)
- Timestamps for creation and updates

### 3. File Storage
- Audio files stored at: `sessions/{sessionId}/mikkel.webm`
- Chunked append for real-time saving
- Automatic directory creation per session

## Technical Implementation

### Audio Capture Flow
1. User clicks "Start Recording" button
2. Browser requests microphone permission
3. MediaRecorder captures audio in WebM format (browser-compatible)
4. Every 1-2 seconds, chunks are sent to backend
5. Backend appends chunks to file and updates database
6. On stop, file is finalized with proper headers

### Key Technologies
- **MediaRecorder API** - Browser audio capture
- **Express.js** - Backend server with raw binary data handling
- **SQLite + Drizzle ORM** - Metadata persistence
- **WebM/Opus** - Audio format for browser compatibility

## Testing

### API Tests (`apps/api/tests/audio-recording.test.ts`)
- Session creation with audio file entries
- Chunk upload and appending
- WAV header finalization
- Empty session handling

### E2E Tests (`apps/web/e2e/audio-recording.spec.ts`)
- UI flow: Start → Grant permission → Record → Stop
- Button state management
- Error handling display

## Usage

### Starting a Recording
```javascript
// Frontend automatically:
1. Creates session via POST /api/session
2. Starts MediaRecorder with getUserMedia
3. Uploads chunks to /api/audio/{sessionId}/mikkel
4. Displays recording status and duration
```

### File Structure
```
apps/api/sessions/
└── {sessionId}/
    └── mikkel.webm  # Host audio track
```

## Configuration
- Sample Rate: 48kHz
- Channels: Mono
- Format: WebM with Opus codec (browser) / WAV (backend processing)
- Chunk Interval: 1-2 seconds
- Max Upload Size: 10MB per chunk

## Error Handling
- Microphone permission denial
- Network failures during upload
- Session creation failures
- Graceful fallback with user feedback

## Future Enhancements
- WAV format conversion for post-processing
- Configurable audio quality settings
- Resume recording after interruption
- Multiple track support (Step 4 will add Freja track)