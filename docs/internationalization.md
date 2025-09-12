# Internationalization (i18n) Support

## Overview
The podcast studio now supports multiple languages with a dynamic language switcher. Currently implemented languages are Danish (default) and English.

## Implementation

### Language Context
**File:** `apps/web/src/contexts/LanguageContext.tsx`

The application uses React Context for language management:
- Provides centralized translation strings
- Enables language switching throughout the app
- Danish set as default language

### Translation Structure
```typescript
interface Translations {
  title: string;
  audioRecording: {
    title: string;
    startRecording: string;
    stopRecording: string;
    requestingPermission: string;
    status: string;
    recording: string;
    idle: string;
    error: string;
    sessionId: string;
  };
  openaiConnection: {
    title: string;
    connect: string;
    disconnect: string;
    connecting: string;
    connected: string;
    disconnected: string;
    status: string;
    connectionEvents: string;
  };
  language: {
    danish: string;
    english: string;
  };
}
```

## Usage

### In Components
```typescript
import { useLanguage } from '../contexts/LanguageContext';

function Component() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <h1>{t.title}</h1>
    <button>{t.audioRecording.startRecording}</button>
  );
}
```

### Language Switcher
Located in the top-right corner of the UI:
- Click "Dansk" for Danish
- Click "English" for English
- Active language highlighted in blue

## Available Translations

### Danish (da)
- **Main Title:** Podcast Studio
- **Audio Section:** Lydoptagelse
  - Start Optagelse / Stop Optagelse
  - Status indicators: Optager, Klar, Fejl
- **OpenAI Section:** OpenAI Forbindelse
  - Forbind / Afbryd
  - Status: Forbundet, Forbinder, Afbrudt

### English (en)
- **Main Title:** Podcast Studio
- **Audio Section:** Audio Recording
  - Start Recording / Stop Recording
  - Status indicators: Recording, Idle, Error
- **OpenAI Section:** OpenAI Connection
  - Connect / Disconnect
  - Status: Connected, Connecting, Disconnected

## Adding New Languages

1. Add language code to type definition:
```typescript
type Language = 'da' | 'en' | 'sv'; // Added Swedish
```

2. Add translations object:
```typescript
const translations: Record<Language, Translations> = {
  da: { ... },
  en: { ... },
  sv: { /* Swedish translations */ }
};
```

3. Add language button in UI:
```jsx
<button onClick={() => setLanguage('sv')}>
  Svenska
</button>
```

## Implementation Details

### Provider Setup
The LanguageProvider wraps the entire application in `layout.tsx`:
```typescript
<LanguageProvider>
  {children}
</LanguageProvider>
```

### HTML Language Attribute
The HTML lang attribute is set to "da" by default in the root layout.

### Persistence
Currently, language selection is not persisted. To add persistence:
1. Save to localStorage when language changes
2. Load from localStorage on initial render
3. Fall back to Danish if no saved preference

## Best Practices
- Keep translation keys descriptive and hierarchical
- Group related translations together
- Use consistent naming patterns
- Provide context-appropriate translations, not literal ones
- Test UI with longest translations to ensure layout compatibility