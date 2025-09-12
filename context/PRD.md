PRD (Product Requirements Document) for dit browser-baserede “podcast-studie” oven på OpenAI Realtime API. Det er skåret ind til benet, så en anden AI/udvikler kan bygge direkte efter det.

# 1. Formål og mål

**Formål:** Et web-UI der gør det let at føre en live, to-vejs samtale mellem Mikkel og “Freja” (AI-medvært), optage **to separate lydspor** (Mikkel og Freja), styre model/voice/temperatur m.m. som i Playground, og **automatisk gemme** alt (transcript, prompts, indstillinger, lydfiler) pr. session.

**Primære mål:**

* Live speech-to-speech samtale (lav latenstid, naturligt flow).
* To lydspor gemt separat (rå data), klar til senere TTS-re-voicing (fx ElevenLabs).
* Stabil persona pr. session (systemprompt), plus emne-kontekst for den aktuelle episode.
* Auto-save, så intet går tabt; alt kan åbnes igen (fuld historik).
* Enkelt setup (monorepo + SQLite) uden over-engineering, men modulært så add-ons er nemme senere.

# 2. Scope (MVP)

**In scope (MVP):**

* Web-UI i browseren (optag/afspil/vis transcript/justér settings).
* Realtime-forbindelse til OpenAI (WebRTC eller WebSocket, afhængigt af platform).
* To separate optagelsesspor:

  1. **Mikkel-mic** (lokal mikrofon via MediaStream)
  2. **Freja-output** (remote audio stream fra modellen)
* Playground-lignende indstillinger: model, voice, temperatur, top\_p, taledetektion/turn-timing, input/output-sprog.
* Persona-felt (fast pr. session) + “dagens kontekst”.
* **Auto-save** af alt løbende; **auto-persist** ved session-slut.
* Session-liste med: titel, dato, fuldt transcript, prompts, settings, filer.
* Eksport/download: rå lydspor (WAV/MP3) + transcript (JSON/Markdown).

**Out of scope (MVP, men forberedt):**

* Autogenererede show notes.
* Push til podcast-tjenester (RSS/Spotify/Apple).
* Gæster/3. spor (kan komme som modul).
* Fine-tuning eller egne stemmer i OpenAI (vi antager ekstern TTS til re-voicing).

# 3. Produktprincipper

* “**Optag altid, tab aldrig**”: auto-save med korte intervaller og ved hvert event.
* “**Ét klik til samtale**”: minimal friktion for at starte/stoppe.
* “**Rå data først**”: gem rå spor + rå transcript; alt andet kan genereres igen.
* “**Konfigurerbart, ikke komplekst**”: Playground-kontroller, men gode defaults.

# 4. Brugerscenarier

1. **Start ny optagelse:** Mikkel vælger model/voice/temperatur, angiver persona + emnekontekst, trykker Start. Taler med Freja. Ser løbende transcript. Stopper → alt er gemt.
2. **Efterproduktion:** Downloader Freja-sporet som WAV → kører det gennem ElevenLabs → lægger den nye stemme på i DAW → bruger transcript som show notes base.
3. **Genbrug settings:** Åbner tidligere session, kopierer persona/indstillinger til en ny session.

# 5. Systemarkitektur (overblik)

* **Frontend (Next.js/React):**

  * Optager Mikkels mic (MediaDevices.getUserMedia).
  * Afspiller Freja-lyd (remote AudioTrack).
  * Viser live transcript + UI-kontroller.
  * Sender lydchunks og metadata til backend løbende (auto-save).
* **Backend (Node/Express eller Next API routes):**

  * Sikker proxy til OpenAI Realtime (mint **kortlivede session-tokens** til WebRTC handshake; aldrig eksponer API-nøgle i klienten). ([OpenAI][1])
  * Modtager/lagrer audio-chunks (to spor), transcript-events, prompts, settings.
  * SQLite DB til sessions, messages, files; fil-storage på disk (eller S3 senere).
* **OpenAI Realtime API:**

  * **WebRTC/WebSocket** til lav latenstid, direkte **audio ind/ud** og samtalehåndtering. ([OpenAI][2])

# 6. OpenAI Realtime: vigtige fakta vi baserer os på

* Realtime API giver **streaming audio ind/ud** og naturligt flow; persistent forbindelse (WebRTC/WebSocket) og **function calling**/værktøjer. ([OpenAI][2])
* Officiel **WebRTC-integration** (lav latenstid, håndterer encoding/noise/congestion). Simpelt browser-eksempel findes i OpenAI’s materiale. ([OpenAI][1])
* “Mere kontrol over svar”: bl.a. **server-side VAD/timing**, custom input-context, og **øget max session length** (30 min), hvilket er relevant for podcast-optagelser. ([OpenAI][1])
* Nyere **gpt-realtime**/realtime-modeller er **GA** med forbedret tale-kvalitet og styring; Realtime API understøtter også ekstra features (f.eks. SIP/telefon, billedinput) – ikke påkrævet i MVP. ([OpenAI][3])

# 7. Detaljerede krav

## 7.1 UI-krav

* **Kontrolpanel (venstre side):**

  * Model-dropdown (seneste Realtime-model), voice-dropdown, temperatur (0–2), top\_p, sprog (da/en), VAD/turn-timing.
  * Felter: **Persona (system)** og **Dagens kontekst**.
  * Knapper: **Start/Stop**, **Markér kapitel** (til klip/kapitelmærker), **Download** (Freja.wav, Mikkel.wav, transcript.md/json).
* **Midterpanel: Live transcript**

  * Replik for replik, markeret som “Mikkel” / “Freja”.
  * Viser også små status-events (fx “\[overlap afbrudt]” hvis barge-in/interrupt sker).
* **Højre side: Session-historik**

  * Liste over sessioner (titel, dato, længde).
  * Klik åbner fuld visning (transcript, prompts, settings, filer).

**Tilgængelighed:** Tastaturgenveje (Start/Stop, Markér kapitel). Tydelig VU-meter for mic og Freja-output.

## 7.2 Persona & kontekst

* **Persona (systemprompt)** låses ved start og gælder hele sessionen.
* **Kontekst (episodens emne)** kan justeres før start; ved ændring midt i session → gemmes som metadata men sendes først med næste “runde” hvis vi ønsker (default: låst ved start for konsistens).
* Backend gemmer begge tekster i DB.
* Realtime-session initialiseres med “instructions”/systemrolle + start-kontekst (implementation afhænger af Realtime event-schema i SDK/reference).

## 7.3 Lyd og optagelse

* **To spor** gemmes separat i realtid:

  * **mikkel.wav**: lokal mic → MediaRecorder (PCM/WAV, 44.1/48 kHz mono) → upload i chunks.
  * **freja.wav**: remote AudioTrack → MediaStreamDestination → MediaRecorder → upload i chunks.
* **Afspilning**: Frejas audio afspilles live i UI (headset anbefales for at undgå bleed).
* **Auto-save**: hver chunk (fx 1–2 sek.) uploades; backend appender til fil på server (stream-write).
* **Finalisering**: ved Stop lukkes streams, filer “flushed” og metadata opdateres (varighed, filstørrelse).

## 7.4 Transcripts

* Realtime leverer løbende tekst-events (modellen + evt. ASR af Mikkels input).
* Frontend viser live tekst; backend gemmer **message-events** med speaker, timestamp, og rå payload (for senere re-render).
* Eksporter:

  * **JSON** (events nøjagtigt som gemt)
  * **Markdown** (renset, pænt format til show notes-grundlag)

## 7.5 Playground-lignende parametre

* **Model**: seneste Realtime-snapshots (fx gpt-4o-realtime… / gpt-realtime). ([OpenAI][1])
* **Voice**: vælg blandt Realtime-voices (test og sæt default). (Voice-valg findes i OpenAI’s Realtime/Audio materiale; faktisk antal/stemmenavne kan skifte). ([platform.openai.com][4])
* **Temperatur** og **top\_p**: eksponeres som sliders.
* **VAD/turn timing**: eksponér “auto-reply on silence” + justérbar stilhed (fx 600–1200 ms). (Server-side VAD timing omtales i OpenAI’s opdatering). ([OpenAI][1])
* **Sprog**: dansk/engelsk (til transskription og output).

## 7.6 Sessions & auto-save

* **Opret session** → backend genererer ID, initial DB-række med alle settings + persona/kontekst.
* **Undervejs**:

  * Alle events (lyd, transcript, kontrol) logges med offsets.
  * Hver N sekunder (fx 3 s) og på hvert event: persist til DB.
* **Slut**: status = “completed”, varigheder, checksums, filstørrelser, token-forbrug (hvis tilgængeligt fra API).
* **Sletning**: “soft delete” + fil-wipe.

## 7.7 Sikkerhed

* **Ingen API-nøgle i browseren**. Backend udsteder **kortlivede tokens**/session-nøgler til Realtime handshake (udløber hurtigt). ([OpenAI][1])
* Rate-limit og throttling på backend-endpoints.
* CORS kun for egen origin i prod.
* Log anonymiserede fejl, ikke rå audio/tekst i applikationslogs.

## 7.8 Ydelse og latenstid

* Mål: start-til-første-lyd < 800 ms på normal forbindelse, løbende svar < 300 ms pr. chunk.
* WebRTC foretrækkes i browser for lav latenstid. ([OpenAI][1])
* CPU-let post-processing i browser (ingen tunge effekter i MVP).

## 7.9 Fejlhåndtering og edge cases

* **Netværksdrop**: automatisk reconnect til Realtime; hvis mislykket → stop optagelse pænt og markér “incomplete”.
* **Audio overlap/barge-in**: hvis Mikkel taler over Freja, brug Realtime-kontrol til at afbryde Frejas tale (hvis understøttet), og log event. (Funktionaliteten findes som “mere kontrol over svar/interruptions”). ([OpenAI][1])
* **Session-timeout**: OpenAI session-grænse (pt. 30 min) → UI viser nedtælling; brugeren kan starte ny session sømløst. ([OpenAI][1])
* **Fil-rotation**: hvis fil > N MB, skriv til næste segment og samle ved afslutning.

# 8. Data- og lagringsdesign (SQLite)

**Tabeller (minimum):**

* `sessions`

  * `id` (uuid, pk), `title`, `created_at`, `completed_at`,
  * `model`, `voice`, `temperature`, `top_p`, `language`, `vad_ms`,
  * `persona_prompt`, `context_prompt`,
  * `status` (“active|completed|failed”), `notes` (nullable)
* `messages`

  * `id`, `session_id`, `speaker` (“mikkel|freja”), `text`, `ts_ms`, `raw_json` (event payload)
* `audio_files`

  * `id`, `session_id`, `speaker`, `path`, `format`, `sample_rate`, `duration_ms`, `size_bytes`, `checksum`
* `settings_snapshots` (valgfrit; ellers i `sessions`)

  * `session_id`, `json`
* Indeks: `messages(session_id, ts_ms)`.

**Filer:**

* `sessions/{id}/mikkel.raw.wav`
* `sessions/{id}/freja.raw.wav`
* `sessions/{id}/transcript.json` (kan genereres fra DB ved export)
* `sessions/{id}/mix.preview.mp3` (valgfri hurtig render)

# 9. API-endpoints (backend, skitse)

* `POST /api/session` → opretter session (returnerer `sessionId` + **kortlivet Realtime-token** til WebRTC handshake). ([OpenAI][1])
* `POST /api/session/:id/event` → log/transcript-event (fallback hvis noget går udenom Realtime-persist).
* `POST /api/session/:id/audio/:speaker` → binære chunks (stream append).
* `POST /api/session/:id/finish` → flush/close, beregn varigheder, skriv metadata.
* `GET /api/session/:id` → metadata + filer + transcript.
* `DELETE /api/session/:id` → soft delete + wipe files.

# 10. Sikkerhed/ret & etik (kort)

* Fortæl lyttere at en AI-stemme er involveret (politikker kræver tydelighed). ([OpenAI][2])
* Brug headsets ved optagelser for at undgå lyd-bleed.
* Tjek licens/brugsvilkår for tredjeparts TTS (ElevenLabs) ift. stemmerettigheder.

# 11. Acceptkriterier (MVP)

* Jeg kan starte en session, tale med Freja og høre svar i realtid.
* **To separate WAV-filer** oprettes og vokser under samtalen; efter stop er de komplette og spilbare.
* **Transcript** vises live og gemmes fuldt i DB; kan eksporteres som JSON/MD.
* **Auto-save** sker løbende; hvis jeg lukker tabben midt i samtalen, kan jeg åbne sessionen igen og se alt frem til sidste event.
* Persona og kontekst vises i session-metadata og blev anvendt i samtalen.
* Jeg kan justere model/voice/temperatur/VAD før start og se værdierne i den gemte session.

# 12. Tekniske noter og defaults

* **Monorepo**: `apps/web` (Next.js), `apps/api` (Node/Express eller Next API), `packages/shared` (types).
* **Audio defaults**: WAV (PCM16), 48 kHz, mono.
* **VAD default**: auto-reply ved \~900 ms stilhed (kan ændres).
* **Lagring**: lokal disk i udvikling; abstraktion så vi kan bytte til S3 senere.
* **Logs**: simple strukturerede logs (JSON) pr. event.

# 13. Fase 2 (planlagte moduler)

* **Show notes** auto-generering (resumé, citater, kapitler, links).
* **Auto-publicering**: generér RSS + upload til host.
* **Gæste-spor**: ekstra input + mixdown.
* **Tool/function calling**: slå fakta op under samtalen (valideret kilde), uden at forstyrre flowet. ([OpenAI][2])

# 14. Risici og mitigering

* **Latenstid** (netværk/CPU): brug WebRTC og simple effekter; monitorér round-trip. ([OpenAI][1])
* **Session-længde**: hvis >30 min, roterer vi automatisk til ny session og linker dem sammen. ([OpenAI][1])
* **Browser-forskelle**: test Chrome/Edge/Safari.
* **Token/forbrug**: vis forbrug per session når OpenAI-events tillader det.

# 15. Referencer (centrale)

* Realtime API (introduktion og capabilities: streaming audio, persistent forbindelse, function calling, Playground). ([OpenAI][2])
* WebRTC-integration, eksempel og “mere kontrol over svar” (server-VAD/timing), **30 min** sessions, nye realtime-modeller/priser. ([OpenAI][1])
* GA-opdatering med `gpt-realtime`, forbedret tale og ekstra Realtime-features (SIP, image input). ([OpenAI][3])
* (Valgfri baggrund) Changelog der nævner WebRTC-metode og voices. ([platform.openai.com][4])


[1]: https://openai.com/index/o1-and-new-tools-for-developers/?utm_source=chatgpt.com "OpenAI o1 and new tools for developers"
[2]: https://openai.com/index/introducing-the-realtime-api/?utm_source=chatgpt.com "Introducing the Realtime API"
[3]: https://openai.com/index/introducing-gpt-realtime/?utm_source=chatgpt.com "Introducing gpt-realtime and Realtime API updates for ..."
[4]: https://platform.openai.com/docs/changelog/may-7th-2024?utm_source=chatgpt.com "Changelog - OpenAI API"
