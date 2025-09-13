# Step 5: Auto-Save & Crash Recovery

## Overview
This feature implements comprehensive auto-save functionality and crash recovery mechanisms to ensure no data loss during podcast recording sessions, even if the browser crashes or closes unexpectedly.

## Primary Purpose
Protect against data loss by continuously saving recording state and providing seamless recovery options for interrupted sessions. Users can close their browser mid-recording and resume exactly where they left off.

## How It Works

### 1. Heartbeat Mechanism
```
Recording starts → Heartbeat every 7s → Backend updates timestamp → Session stays "active"
                                     ↓
                            No heartbeat for 30s
                                     ↓
                            Session marked "incomplete"
```

### 2. Session Lifecycle
- **Active**: Currently recording with recent heartbeat
- **Incomplete**: No heartbeat received (crashed/closed)
- **Completed**: Recording stopped normally

### 3. Recovery Flow
1. Page loads → Check for incomplete sessions
2. Show recovery notification if found
3. User can resume recording or mark as complete
4. Audio files remain intact throughout

## Technical Implementation

### Backend Components

#### `/apps/api/src/server.ts`
New endpoints for session management:

##### `POST /api/session/:id/keepalive`
- Updates session's `lastHeartbeat` timestamp
- Validates session exists and is active
- Returns 400 for non-active sessions

##### `POST /api/session/check-timeouts`
- Marks sessions as incomplete after timeout
- Configurable timeout (default: 30 seconds)
- Returns count of timed-out sessions

##### `POST /api/session/:id/finish`
- Marks session as completed
- Sets `completedAt` timestamp
- Only works for active/incomplete sessions

##### `GET /api/sessions`
- Lists all sessions with status
- Includes metadata and timestamps

##### `GET /api/session/:id`
- Detailed session info with audio files
- File paths and sizes included

#### Database Schema Updates
```typescript
// apps/api/src/db/schema.ts
sessions: {
  lastHeartbeat: timestamp('last_heartbeat')
  completedAt: timestamp('completed_at')
  status: text('status') // 'active' | 'incomplete' | 'completed'
}
```

### Frontend Components

#### `/apps/web/src/hooks/useKeepalive.ts`
Manages heartbeat mechanism:
- Sends keepalive every 7 seconds during recording
- Automatic start/stop with recording state
- Graceful error handling

#### `/apps/web/src/hooks/useSessionRecovery.ts`
Handles session recovery:
- Fetches all sessions on mount
- Identifies incomplete sessions
- Provides recovery methods

#### `/apps/web/src/components/SessionHistory.tsx`
Visual session management:
- Lists all sessions with status badges
- Expandable details showing audio files
- Actions to resume or complete sessions
- File size and metadata display

#### `/apps/web/src/hooks/useDualTrackRecording.ts`
Enhanced with auto-save:
- Integrates keepalive hook
- Auto-finalizes on normal stop
- Maintains session ID for recovery

### UI Features

#### Recovery Notification
```typescript
{incompleteSessions.length > 0 && (
  <div className="notification">
    Found {incompleteSessions.length} incomplete session(s)
    <button onClick={handleResume}>Resume</button>
    <button onClick={handleFinish}>Mark Complete</button>
  </div>
)}
```

#### Session History Display
- Color-coded status badges (green/yellow/gray)
- Expandable session details
- File sizes in human-readable format
- Quick actions for session management

## Configuration

### Timing Parameters
```javascript
const KEEPALIVE_INTERVAL = 7000; // 7 seconds
const SESSION_TIMEOUT = 30000;   // 30 seconds
const HEARTBEAT_ENDPOINT = '/api/session/:id/keepalive';
```

### Session Status Values
- `active`: Currently recording with recent heartbeat
- `incomplete`: No heartbeat within timeout period
- `completed`: Recording finished normally

## Usage Flow

### Normal Recording
1. Start recording → Session created as "active"
2. Heartbeat sent every 7 seconds
3. Stop recording → Session marked "completed"
4. Audio files finalized with proper headers

### Crash Recovery
1. Browser crashes → Heartbeat stops
2. After 30 seconds → Session marked "incomplete"
3. User reopens app → Sees recovery notification
4. Resume recording → Continues with same session ID
5. Audio chunks already saved remain intact

## Testing

### API Tests (`/apps/api/src/routes/session.test.ts`)
- Session status tracking
- Keepalive mechanism
- Timeout detection
- Session listing and details

### E2E Tests (`/apps/web/e2e/step-05-auto-save.spec.ts`)
- Crash recovery simulation
- Heartbeat timeout testing
- Session history verification

## Benefits

1. **Zero Data Loss**: All audio chunks saved immediately
2. **Seamless Recovery**: Resume exactly where left off
3. **Session Management**: Complete visibility of all recordings
4. **Automatic Cleanup**: Incomplete sessions easily identified
5. **User Control**: Choose to resume or finalize sessions

## Error Handling

- Network failures don't stop keepalive loop
- Missing sessions return appropriate 404 errors
- Invalid state transitions prevented (e.g., can't complete already completed session)
- Graceful degradation if keepalive fails

## Future Enhancements

- Automatic session cleanup after X days
- Session export/import functionality
- Multi-device session sync
- Offline recording with sync on reconnect
- Session analytics and duration tracking