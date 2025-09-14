# EPIC: Podcast Studio Fixes & Improvements

## = BUG: AI Agent Starter p� Engelsk Selvom Dansk Persona Prompt er Sat

### Problem
N�r brugeren starter en samtale med AI-agenten, introducerer den sig altid p� engelsk, selv n�r der er sat en dansk systemprompt (persona_prompt) og dansk kontekst (context_prompt) i UI'en. Dette sker fordi sessionId ikke bliver sendt med n�r WebRTC forbindelsen etableres.

### Root Cause Analyse

#### Flowet som det fungerer nu:
1. **Session oprettes korrekt**: N�r bruger klikker "Start Recording", sendes persona_prompt og context_prompt korrekt til `/api/session` endpoint
2. **Session gemmes i database**: Backend gemmer prompts korrekt i sessions tabellen
3. **WebRTC forbindelse etableres**: Frontend kalder `connect()` i useRealtimeConnection hook
4. **Token hentes UDEN sessionId**: Frontend henter ephemeral token fra `/api/realtime/token` men sender IKKE sessionId med i request body
5. **Backend bruger default instruktioner**: Da backend ikke modtager sessionId, kan den ikke finde brugerens prompts og falder tilbage til hardcoded engelsk: `"You are a helpful AI assistant in a podcast studio."`

#### Problematiske kodesteder:

**Frontend - Missing sessionId i token request:**
```typescript
// apps/web/src/hooks/useRealtimeConnection.ts:135-140
const tokenResponse = await fetch('http://localhost:4201/api/realtime/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
  // PROBLEM: Ingen body med sessionId!
});
```

**Backend - Forventer sessionId men f�r den ikke:**
```typescript
// apps/api/src/server.ts:132
const { sessionId } = req.body as { sessionId?: string }
// sessionId er altid undefined n�r kaldt fra frontend
```

**Hardcoded fallback instruktioner:**
1. Backend default (apps/api/src/server.ts:134):
   ```typescript
   let instructions = 'You are a helpful AI assistant in a podcast studio.'
   ```

2. Frontend default (apps/web/src/hooks/useRealtimeConnection.ts:195):
   ```typescript
   let instructions = 'You are Freja, a friendly AI podcast co-host. Be conversational and engaging.';
   ```

### L�sningsforslag

#### Option 1: Send sessionId med token request (Anbefalet)
Modificer frontend til at sende sessionId n�r token hentes:

```typescript
// apps/web/src/hooks/useRealtimeConnection.ts
// Tilf�j sessionId som parameter til attemptConnect
const attemptConnect = useCallback(async (
  settings?: any,
  conversationContext?: Array<{ speaker: 'human' | 'ai'; text: string }>,
  sessionId?: string  // NY PARAMETER
): Promise<void> => {
  // ...

  const tokenResponse = await fetch('http://localhost:4201/api/realtime/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sessionId })  // SEND sessionId
  });

  // ...
});

// Opdater connect function til at modtage og videregive sessionId
const connect = useCallback(async (
  settings?: any,
  conversationContext?: Array<{ speaker: 'human' | 'ai'; text: string }>,
  sessionId?: string  // NY PARAMETER
) => {
  // ...
  await attemptConnect(settings, conversationContext, sessionId);
  // ...
});
```

Og i hovedkomponenten skal sessionId sendes n�r connect kaldes:

```typescript
// apps/web/src/app/page.tsx
const handleConnect = () => {
  if (status === 'disconnected' || status === 'error') {
    connect(currentSettings, undefined, currentSessionId);  // SEND currentSessionId
  }
};
```

#### Option 2: Gem settings i hook state
Alternativt kunne settings/prompts gemmes i useRealtimeConnection hook's state og bruges direkte uden at hente fra backend.

### Test Scenarios
1. Opret ny session med dansk persona prompt
2. Start recording og verificer at AI svarer p� dansk
3. Genstart forbindelse og check at dansk prompt stadig bruges
4. Test med tom persona prompt - skal falde tilbage til default

### Relaterede Issues
- Frontend sender ogs� sine egne default instruktioner som overstyrer backend
- Ingen validering af at prompts faktisk bliver anvendt korrekt
- Manglende fejlh�ndtering hvis session ikke findes

### Prioritet
**H�J** - Dette p�virker brugeroplevelsen direkte og g�r det umuligt at bruge danske prompts konsistent

---

## 🐛 BUG: Session Mapper vs Database Mismatch - 1888 Orphaned Sessions

### Problem
Der ligger 1888 session mapper i `apps/api/sessions/` mappen, men kun 1 session findes i databasen. Dette betyder at brugeren ikke kan se sine tidligere sessions i UI'en, selvom der ligger potentielt vigtige optagelser på disk.

### Root Cause Analyse

#### Nuværende tilstand:
- **1888 session mapper** på disk i `apps/api/sessions/`
- **Kun 1 session** i SQLite databasen (`podcast-studio.db`)
- Den ene DB session (`c12cf235-1b1e-401a-837d-059a835153ed`) har en tom mappe
- Mange mapper indeholder faktiske audio filer (mikkel.wav, freja.wav, etc.)

#### Hvorfor vises sessions ikke i UI'en:
1. **API returnerer kun DB records**: `/api/sessions` endpoint læser fra database, ikke fra disk
2. **Manglende DB records**: De 1887 andre session mapper har ingen tilsvarende database records
3. **UI viser kun API response**: Frontend hooks (`useSessionResume`, `useSessionRecovery`) henter kun fra API

#### Hvordan opstod problemet:
Sessions bliver oprettet som mapper på disk UDEN at blive gemt i databasen. Dette sker når:
- Tests køres og opretter mapper direkte uden DB insert
- Session creation fejler efter mappe oprettelse men før DB save
- API endpoints kaldes i forkert rækkefølge eller med manglende error handling
- Udviklingsserver genstartes midt i session creation flow

### Problematiske kodesteder

**Session creation flow der kan fejle:**
```typescript
// apps/api/src/server.ts - POST /api/session
// Mappe oprettes her, men hvis DB insert fejler efterfølgende,
// efterlades orphaned folder
const sessionDir = path.join(sessionsDir, sessionId);
fs.mkdirSync(sessionDir, { recursive: true });

// Hvis denne fejler, har vi allerede oprettet mappen
await db.insert(sessions).values({...});
```

**API returnerer kun DB sessions:**
```typescript
// apps/api/src/server.ts:937
app.get('/api/sessions', async (req, res) => {
  // Læser KUN fra database, ikke fra disk
  const allSessions = await db.select().from(sessions)
    .orderBy(/* ... */)
    .limit(limit)
    .offset(offset);
});
```

### Data der risikerer at gå tabt

Analyse af eksisterende mapper viser:
- Flere mapper indeholder faktiske audio optagelser
- Filnavne inkluderer: `mikkel.wav`, `freja.wav`, `human.wav`, `ai.wav`
- Nogle har segment-baserede filer: `human_segment_1.wav`, `ai_segment_1.wav`
- De fleste mapper (ca. 1800+) er dog tomme test-sessions

### Løsningsforslag

#### Fase 1: Akut oprydning og backup
1. **Identificer værdifulde sessions**: Find alle mapper med audio filer
2. **Backup før sletning**: Kopier mapper med indhold til backup location
3. **Slet tomme mapper**: Fjern alle mapper uden filer
4. **Audit log**: Generer liste over slettede vs. bevarede sessions

Bash script til identifikation:
```bash
# Find mapper med indhold
find apps/api/sessions -type d -mindepth 1 -exec sh -c '
  if [ -n "$(find "$1" -type f -name "*.wav" -o -name "*.webm" | head -1)" ]; then
    echo "$1 - HAS AUDIO"
  else
    echo "$1 - EMPTY"
  fi
' _ {} \;
```

#### Fase 2: Fix session creation flow
1. **Transactional creation**: Opret DB record FØRST, derefter mappe
2. **Rollback on failure**: Slet mappe hvis DB insert fejler
3. **Validation endpoint**: Endpoint der synkroniserer disk og DB

Foreslået kode fix:
```typescript
// Start transaction
const session = await db.transaction(async (tx) => {
  // 1. Insert i database først
  const [newSession] = await tx.insert(sessions).values({...}).returning();

  try {
    // 2. Opret mappe
    const sessionDir = path.join(sessionsDir, newSession.id);
    await fs.promises.mkdir(sessionDir, { recursive: true });

    return newSession;
  } catch (error) {
    // 3. Rollback DB hvis mappe creation fejler
    throw error; // Dette trigger automatic rollback
  }
});
```

#### Fase 3: Recovery tool
Opret admin endpoint eller script til at:
1. Scanne alle mapper på disk
2. Identificere mapper uden DB records
3. Give mulighed for at:
   - Oprette manglende DB records for værdifulde sessions
   - Slette orphaned tomme mapper
   - Eksportere audio filer før sletning

### Test Scenarios
1. Test at session creation er atomic (enten alt eller intet oprettes)
2. Test rollback ved forskellige failure points
3. Verificer at UI viser alle sessions med DB records
4. Test recovery af orphaned sessions med audio content

### Estimeret Impact
- **Data risiko**: HØJ - Brugere kan have værdifulde optagelser i orphaned sessions
- **Performance**: MEDIUM - 1888 mapper kan påvirke filesystem performance
- **User experience**: HØJ - Brugere kan ikke se/tilgå deres tidligere sessions

### Prioritet
**KRITISK** - Potentiel datatab og bruger kan ikke tilgå tidligere optagelser

### Anbefalet Action Plan
1. **IMMEDIATE**: Backup alle mapper med audio content
2. **TODAY**: Implementer oprydningsscript med audit log
3. **THIS WEEK**: Fix session creation flow med proper transaction handling
4. **NEXT SPRINT**: Byg recovery tool til at genoprette orphaned sessions

---