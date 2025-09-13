# Step 9: File Download & Export Implementation

## Overview
This document captures the implementation details for Step 9, which adds file download and export functionality to the podcast studio application. Users can now download audio recordings and transcripts from completed sessions.

## Features Implemented

### 1. Audio File Download
- **Endpoint**: `GET /api/session/:id/file/:speaker`
- **Supported speakers**: `mikkel`, `freja`
- **Format**: WAV files (audio/wav)
- **Streaming**: Files are streamed directly from the filesystem

### 2. Transcript Export
- **JSON Endpoint**: `GET /api/session/:id/transcript.json`
  - Returns structured transcript data with speaker, text, and timestamps
  - Content-Type: `application/json; charset=utf-8`

- **Markdown Endpoint**: `GET /api/session/:id/transcript.md`
  - Returns formatted transcript with session title and conversation flow
  - Format: `**[timestamp] Speaker:** text`
  - Content-Type: `text/markdown; charset=utf-8`

## Implementation Details

### Backend (API)

#### File: `apps/api/src/server.ts`
Added three new endpoints after the existing messages endpoint:

```typescript
// Audio file download
app.get('/api/session/:id/file/:speaker', async (req, res) => {
  // Validates session ID and speaker parameter
  // Streams WAV file with proper headers
  // Returns 404 for missing files/sessions
  // Returns 400 for invalid speaker
});

// JSON transcript export
app.get('/api/session/:id/transcript.json', async (req, res) => {
  // Fetches messages from database
  // Returns sorted messages with metadata
  // Handles empty sessions gracefully
});

// Markdown transcript export
app.get('/api/session/:id/transcript.md', async (req, res) => {
  // Generates formatted markdown transcript
  // Includes session title and timestamp formatting
  // Handles empty sessions with appropriate message
});
```

### Frontend (Web)

#### File: `apps/web/src/utils/download.ts`
Created utility functions for triggering downloads:

```typescript
export async function downloadMikkelAudio(sessionId: string, onError?: (error: Error) => void): Promise<void>
export async function downloadFrejaAudio(sessionId: string, onError?: (error: Error) => void): Promise<void>
export async function downloadTranscriptJson(sessionId: string, onError?: (error: Error) => void): Promise<void>
export async function downloadTranscriptMarkdown(sessionId: string, onError?: (error: Error) => void): Promise<void>
```

Each function:
- Constructs the appropriate API endpoint URL
- Triggers browser download with proper filename
- Handles errors gracefully with optional callback

#### File: `apps/web/src/components/SessionHistory.tsx`
Enhanced with download functionality:

- Added download buttons section for completed sessions
- Buttons only appear when session status is "completed"
- Audio buttons conditionally shown based on file existence
- Color-coded buttons for visual distinction:
  - Blue: Mikkel's audio
  - Green: Freja's audio
  - Purple: JSON transcript
  - Orange: Markdown transcript
- Loading states during download ("Downloading...")
- Error handling with user feedback

#### File: `apps/web/src/contexts/LanguageContext.tsx`
Added bilingual translations:

```typescript
download: {
  mikkelAudio: { da: 'Download Mikkel', en: 'Download Mikkel' },
  frejaAudio: { da: 'Download Freja', en: 'Download Freja' },
  transcriptJson: { da: 'Download JSON', en: 'Download JSON' },
  transcriptMarkdown: { da: 'Download Markdown', en: 'Download Markdown' },
  downloading: { da: 'Downloader...', en: 'Downloading...' },
  error: { da: 'Download fejlede', en: 'Download failed' }
}
```

### Testing

#### File: `apps/api/src/routes/download.test.ts`
Comprehensive test suite covering:
- Audio file streaming with correct content-type
- Transcript export in both JSON and Markdown formats
- Error handling (404 for missing sessions, 400 for invalid parameters)
- Empty session handling
- Content validation

#### File: `apps/web/e2e/download.spec.ts`
Playwright E2E tests for:
- Download button visibility for completed sessions
- File download triggering
- Filename validation
- Error handling UI
- Conditional button display based on file existence

## Error Handling

### API Error Responses
- **400 Bad Request**: Invalid speaker parameter (not 'mikkel' or 'freja')
- **404 Not Found**: Session not found or audio file missing
- **500 Internal Server Error**: Database or filesystem errors

### UI Error Handling
- Download buttons show "Downloading..." during operation
- Error messages displayed on failure
- Buttons disabled during download to prevent duplicate requests

## Security Considerations

1. **Session Validation**: All endpoints validate session existence before file access
2. **Path Traversal Prevention**: Speaker parameter is validated against whitelist
3. **File Streaming**: Uses Express's built-in res.sendFile() with security checks
4. **No Direct File Paths**: Client never receives direct filesystem paths

## File Structure

```
sessions/
  {sessionId}/
    mikkel.wav      # Host audio recording
    freja.wav       # AI co-host audio recording
```

## Database Integration

Transcript exports pull data from:
- `sessions` table: Session metadata (title, settings)
- `messages` table: Transcript entries with speaker, text, and timestamps

Messages are sorted by `ts_ms` for chronological order in exports.

## Performance Considerations

1. **File Streaming**: Audio files are streamed rather than loaded into memory
2. **Database Queries**: Efficient joins between sessions and messages tables
3. **Client-side**: Download utility functions handle large files gracefully
4. **Conditional Rendering**: UI only shows relevant buttons based on data availability

## Future Enhancements

Potential improvements for future iterations:
- Batch download (ZIP archive with all files)
- Additional export formats (SRT, VTT for subtitles)
- Audio format conversion options
- Transcript filtering/search before export
- Download progress indicators for large files

## Testing Instructions

### Manual Testing
1. Complete a recording session
2. Navigate to session history
3. Verify download buttons appear for completed sessions
4. Test each download button:
   - Audio files should play in media players
   - JSON should be valid and structured
   - Markdown should be readable and formatted
5. Verify error handling by attempting downloads on deleted sessions

### Automated Testing
```bash
# Run API tests
pnpm test:api

# Run E2E tests (requires running dev servers)
pnpm test:e2e
```

## Commit Information

- **Branch**: `feat/step_09`
- **Commit**: `a6c0d57` - feat(step_09): implement file download and export functionality
- **Tests**: All 40 API tests passing
- **PR URL**: Ready at https://github.com/mikkelkrogsholm/podcast-studio/pull/new/feat/step_09