# Step 07: Playground Controls Implementation

## Overview
This feature adds OpenAI Realtime API configuration controls to the podcast studio, allowing users to customize AI model settings before starting a recording session. The implementation follows a settings-per-session model where configurations are locked once recording begins.

## Features Implemented

### Settings Configuration
Users can configure the following parameters before starting a session:
- **Model**: Currently supports `gpt-4o-realtime-preview`
- **Voice**: Six voice options (alloy, echo, fable, onyx, nova, shimmer)
- **Temperature**: Creativity control (0.0 to 1.0, default 0.8)
- **Top P**: Nucleus sampling parameter (0.0 to 1.0, default 1.0)
- **Language**: Interface and AI language (da-DK, en-US)
- **Silence Threshold**: VAD silence detection in milliseconds (default 900ms)

### Key Components

#### Frontend Components
- **`SettingsForm.tsx`**: Main form component with real-time validation
  - Implements Zod schemas for client-side validation
  - Persists form state to localStorage
  - Disables during active recording sessions
  - Bilingual support (Danish/English)

- **`CurrentSettings.tsx`**: Display component for active session settings
  - Shows locked settings during recording
  - Provides visual feedback on active configuration

#### Backend Implementation
- **Database Schema**: Added `settings` TEXT column to sessions table
  - Stores JSON-serialized settings per session
  - Settings are immutable once session starts

- **API Endpoints**:
  - `POST /api/session`: Enhanced to accept and validate settings
  - `GET /api/session/:id`: Returns session with parsed settings
  - Settings validation using Zod schemas with defaults

#### Validation Schemas
```typescript
const SettingsSchema = z.object({
  model: z.enum(['gpt-4o-realtime-preview']).default('gpt-4o-realtime-preview'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  temperature: z.number().min(0).max(1).default(0.8),
  top_p: z.number().min(0).max(1).default(1.0),
  language: z.enum(['da-DK', 'en-US']).default('da-DK'),
  silence_ms: z.number().positive().default(900)
})
```

## Technical Implementation Details

### Database Migration
Added in `src/db/migrate.ts`:
```sql
ALTER TABLE sessions ADD COLUMN settings TEXT
```

### Test Coverage
- **API Tests**: 6 new tests for settings validation and persistence
- **E2E Tests**: 6 tests for UI behavior (2 skipped pending full recording implementation)

### CI/CD Configuration
- Modified `vitest.config.ts` to run tests sequentially
- Prevents SQLite database lock issues in CI environment
- Ensures consistent test execution

## Usage Flow

1. **Pre-Session**: User configures desired settings via the form
2. **Session Creation**: Settings are validated and stored with the session
3. **During Recording**: Settings are locked and displayed as read-only
4. **Post-Session**: Settings remain immutable in session history

## Important Files

### Modified Files
- `/apps/api/src/server.ts`: Added settings validation and storage
- `/apps/api/src/db/migrate.ts`: Database schema migration
- `/apps/api/vitest.config.ts`: Sequential test execution configuration
- `/apps/web/src/app/page.tsx`: Integrated SettingsForm component

### New Files
- `/apps/web/src/components/SettingsForm.tsx`: Settings configuration UI
- `/apps/web/src/components/CurrentSettings.tsx`: Settings display component
- `/apps/api/src/routes/session.test.ts`: Extended with settings tests
- `/apps/web/e2e/step-07-playground-controls.spec.ts`: E2E test suite

## Testing Considerations

### Local Testing
```bash
# Run API tests
cd apps/api && pnpm test

# Run E2E tests (requires dev servers)
pnpm dev:api & pnpm dev:web &
cd apps/web && pnpm test:e2e --grep "step-07"
```

### Known Limitations
- Two E2E tests are skipped as they require full recording functionality
- Settings cannot be modified after session starts (by design)
- Only `gpt-4o-realtime-preview` model currently supported

## Future Enhancements
- Additional AI model support as they become available
- Advanced VAD configuration options
- Session templates for quick configuration
- Settings presets/profiles for different podcast types

## Integration Notes
The settings are designed to be consumed by the OpenAI Realtime API initialization:
```javascript
// Example usage in WebRTC/WebSocket connection
const realtimeConfig = {
  model: session.settings.model,
  voice: session.settings.voice,
  temperature: session.settings.temperature,
  top_p: session.settings.top_p,
  // ... other settings
}
```

## Troubleshooting

### Database Lock Errors
If encountering "database is locked" errors during testing:
1. Ensure no dev servers are running: `pkill -f node`
2. Tests are configured to run sequentially in CI
3. Local parallel testing may require stopping background processes

### Foreign Key Constraints
The implementation maintains referential integrity. Ensure sessions exist before inserting related data (audio_files, messages).