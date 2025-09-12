Her er en **konkret byggeplan** i små, afgrænsede trin – **TDD hvor det giver mening**, **ingen mocks**, og **ingen over-engineering**. Hvert trin har mål, scope (hvad vi **ikke** gør endnu), implementeringsnote, og **tests/acceptance** før vi går videre.

# Preflight: rammer og principper

* **Monorepo**: `apps/web` (Next.js/React), `apps/api` (Node/TS), `packages/shared` (types).
* **DB**: SQLite (Drizzle eller Prisma – vælg én; jeg skriver “Drizzle” nedenfor for enkelhed).
* **Sprog/stack**: TypeScript strict, ESLint + Prettier, pnpm.
* **Tests**: Vitest til API/DB, Playwright til e2e i browser. “Live”-tests kører kun når `OPENAI_API_KEY` er sat.
* **Secrets**: kun i backend via env. Klient får kun kortlivede tokens.
* **Over-engineering forbudt**: ingen generiske lag, ingen abstraktioner “for en regnvejrsdag”. Byg præcist det næste skridt kræver – ikke mere.

---

## Trin 0 — Repo-skelet & kvalitet

**Mål:** Kørbar monorepo med tom web, tom api, SQLite forbundet, lint/test tooling.

**Scope (ikke nu):** Ingen OpenAI, ingen audio, ingen UI udover “it works”.

**Implementering (kort):**

* `apps/api`: Node + Fastify/Express, route: `GET /health`.
* `packages/shared`: tsconfig base, zod utils.
* Drizzle + SQLite: én tabel `migrations_meta`.
* Scripts: `dev:web`, `dev:api`, `lint`, `test`.
* CI: GitHub Actions (lint + tests).

**Tests/acceptance:**

* Vitest: `GET /health` returnerer `{ ok: true }`.
* DB init test: kan åbne SQLite fil, køre en migration.

---

## Trin 1 — OpenAI-tilslutning (ingen lyd endnu)

**Mål:** Backend kan kalde OpenAI (rest), og vi kan udstede **kortlivet session-token** til klienten (til Realtime/WebRTC senere).

**Scope:** Intet WebRTC endnu, ingen streaming.

**Implementering:**

* `POST /api/realtime/token`: generér kortlivet token (server-side) og retur JSON.
  (Detaljer afhænger af Realtime API’s forventede “ephemeral/ephemeral-like” token. Vi implementerer præcis efter docs, men koden holdes minimal.)
* Env validering (`OPENAI_API_KEY`), fail fast ved start.

**Tests/acceptance:**

* Vitest: Kald `POST /api/realtime/token` med gyldig nøgle → 200 og token-format.
* Playwright: åbn web, klik “Hent token” → viser token-modtaget i UI (ingen forbindelse endnu).

---

## Trin 2 — WebRTC/WebSocket handshake til Realtime

**Mål:** Klient kan etablere **liveforbindelse** til Realtime og modtage et simpelt tekst-event.

**Scope:** Ingen mic, ingen al lyd endnu.

**Implementering:**

* `apps/web`: knap “Connect”, der henter token fra backend og opretter Realtime-session (WebRTC hvis muligt, fallback WS hvis nødvendigt).
* Vis “Connected” + sidste event i et lille logpanel.

**Tests/acceptance:**

* Manuelt (nødvendigt for medie-tilladelser): Klik “Connect” → inden for få sekunder: “Connected”.
* Vitest (backend): smoke test til OpenAI endpoint (f.eks. models) for at sikre nøglen lever.

---

## Trin 3 — Lokal mic-capture (Mikkel-spor) + upload i chunks

**Mål:** Optag **din mikrofon** i browseren, **upload i chunks** til backend, append til `sessions/{id}/mikkel.wav`.

**Scope:** Stadig ingen AI-lyd, ingen Realtime audio ud.

**Implementering:**

* UI: “Start session” → backend `POST /api/session` (opret række i `sessions`).
* Brug `getUserMedia({ audio: true })` → `MediaRecorder` (WAV/PCM16, 48kHz mono).
* `ondataavailable` → `POST /api/session/:id/audio/mikkel` (binary append).
* DB: `sessions` + `audio_files` (læg filstier).

**Tests/acceptance:**

* Playwright: start session, giv mic-tilladelse, tal 3 sek., stop → backend har fil > 0 bytes, `audio_files` række oprettet.
* Vitest (backend): append-write giver korrekt filstørrelse; lukning “finaliserer” header.

---

## Trin 4 — AI-output som **separat** spor (Freja-spor)

**Mål:** Modtag Realtime **audio output** og optag det i **andet spor** (`freja.wav`) **samtidig** med live-afspilning.

**Scope:** Ingen transcript endnu.

**Implementering:**

* Når Realtime forbinder, få remote `AudioTrack` (fra peer connection).
* Route via `AudioContext` → `MediaStreamDestination` → `MediaRecorder` → send chunks til `POST /api/session/:id/audio/freja`.
* Afspil i UI via `<audio>` (eller Web Audio sink). Brug headset for at undgå bleed.

**Tests/acceptance:**

* Playwright: start session, prompt model til at sige noget kort → hør lyd i headset; fil `freja.wav` vokser.
* Vitest (backend): begge spor registreres i DB, metadata udfyldes ved stop.

---

## Trin 5 — Auto-save af session + “crash-sikkerhed”

**Mål:** **Auto-save** alt løbende: hver audio-chunk og meta-event gemmes; hvis tab lukkes, findes data i DB.

**Scope:** Endnu ingen transcript.

**Implementering:**

* `POST /api/session/:id/keepalive` hver 5–10 sek. (timestamp).
* Persistér “session heartbeat”.
* Ved “Start session”: opret `status=active`; ved “Stop”: `completed`.

**Tests/acceptance:**

* Playwright: start, tal 5 sek., luk tab uden at trykke Stop → genåbn app, gå til “Historik” → session findes med filer og varighed>0.
* Vitest: “incomplete” markeres korrekt ved inaktivitet > N sek. (server side).

---

## Trin 6 — Transcript (live visning + persist)

**Mål:** Vise og gemme live-transcript (Mikkel + Freja). Min. krav: du ser tekst rulle under samtalen.

**Scope:** Simpel tekst uden kapitler.

**Implementering:**

* Brug Realtime’s events:

  * ASR af mic (hvis leveret server-side) **eller** lokal ASR via Realtime input-stream (afhænger af API).
  * Model-svar som tekststream.
* `messages` tabel: `speaker`, `text`, `ts_ms`, `raw_json`.
* UI “Transcript” midterpanel.

**Tests/acceptance:**

* Playwright: sig en kort sætning → se din tekst dukke op; Freja svarer → hendes tekst dukker op; DB har `messages.count > 0`.
* Vitest: serialisering af events → DB rækker med korrekt `speaker` og tidsstempel.

---

## Trin 7 — Basis-kontroller (model, voice, temperatur, VAD)

**Mål:** Playground-style kontroller i UI; værdierne anvendes **ved session start**.

**Scope:** Ingen runtime-ændringer midt i session (hold simpelt).

**Implementering:**

* Formular: model-select, voice-select, `temperature` slider, `top_p`, `silence_ms` (VAD), `language`.
* Værdier **persistes** i `sessions`.
* Session-opstart bruger netop disse værdier i Realtime init.

**Tests/acceptance:**

* Playwright: vælg custom værdier → start session → `GET /api/session/:id` viser præcist disse værdier.
* Vitest: validering af payload (zod), default-værdi fallback.

---

## Trin 8 — Persona (system) + Dagens kontekst (episode)

**Mål:** Lås persona **pr. session**; dagskontekst injiceres ved start.

**Scope:** Ingen midtvejsredigering (du ønskede stabil persona gennem optagelsen).

**Implementering:**

* To tekstfelter før start: `persona_prompt`, `context_prompt`.
* Sendes i Realtime init; gemmes i `sessions`.

**Tests/acceptance:**

* Playwright: udfyld begge, start → DB har de præcise strenge; i UI vises “Persona låst” badge.
* Manuelt: oplevelsen matcher forventet tone/viden.

---

## Trin 9 — Download & eksport

**Mål:** Ét klik for at hente `mikkel.wav`, `freja.wav`, `transcript.(json|md)`.

**Scope:** Ingen mixdown, ingen show notes endnu.

**Implementering:**

* `GET /api/session/:id/file/:speaker` → stream den rå fil.
* `GET /api/session/:id/transcript.(json|md)` → generér fra DB.

**Tests/acceptance:**

* Vitest: endpoints returnerer `200`, korrekt `content-type`, filstørrelse > 0.
* Playwright: klik download-knapper, filer gemmes.

---

## Trin 10 — Robusthed: stop/retry/interrupt

**Mål:** Pæn lukning, mulighed for at afbryde Freja (barge-in), reconnect ved netværkssvigt.

**Scope:** Ingen avanceret kø-logik.

**Implementering:**

* “Stop” knap: luk lokal recorder, send `finish`, luk Realtime.
* “Interrupt” knap: send Realtime-event til at afbryde AI-tale.
* Reconnect strategi: 1–2 retries; markér “incomplete” hvis opgivelse.

**Tests/acceptance:**

* Playwright: mens Freja taler → tryk “Interrupt” → output stopper, event logges.
* Vitest: `/finish` sætter `completed_at` og opdaterer `audio_files.duration_ms`.

---

## Trin 11 — Session-liste & detaljer

**Mål:** Historikside der viser alle sessions med metadata, hurtig preview af transcript og links til filer.

**Scope:** Ingen søgning/filter endnu.

**Implementering:**

* `GET /api/session` → liste.
* UI: klik åbner detaljer: prompts, settings, varighed, links til filer, transcript.

**Tests/acceptance:**

* Vitest: liste returnerer seneste først.
* Playwright: åbn detalje, se felter udfyldt.

---

## Trin 12 — “Add-on hook points” (uden features endnu)

**Mål:** Læg **små, konkrete** hook-punkter så add-ons kan kobles på senere (show notes, RSS), uden at bygge dem nu.

**Scope:** Ingen generatorer implementeret.

**Implementering:**

* Efter `/finish`: emit “session\:completed” (intern event) → no-op subscriber.
* Eksternt modul kan senere subscrib’e og køre show-notes/RSS.

**Tests/acceptance:**

* Vitest: event emitter kaldes; ingen sideeffekter.
* Ingen UI-ændring.

---

# Datamodel (minimum – Drizzle)

* `sessions(id, title, created_at, completed_at, model, voice, temperature, top_p, language, vad_ms, persona_prompt, context_prompt, status)`
* `messages(id, session_id, speaker, text, ts_ms, raw_json)`
* `audio_files(id, session_id, speaker, path, format, sample_rate, duration_ms, size_bytes, checksum)`

**Best practice:** tidsstempler i ms; `speaker` som enum (`mikkel|freja`); foreign keys + index på `(session_id, ts_ms)`.

---

# Kodestandard & praktiske regler

* **TypeScript strict**; ingen `any`.
* **Env-håndtering**: zod-validering af `process.env` ved start; crash på mangler.
* **Fejlhåndtering**: kun meningsfulde `try/catch`; ingen “magiske” globale handlers.
* **Logging**: struktureret JSON (pino/winston). Log ikke rå lyd eller fulde prompts; log kun IDs og længder.
* **Filhåndtering**: stream append; flush ved stop. Max filstørrelse (rotation) kan komme senere – **ikke** nu.
* **UI**: minimal styling (Tailwind), ingen store component-biblioteker før nødvendigt.
* **Sikkerhed**: CORS låst i prod; ingen nøgler i klient; tokens kortlivede.
* **Ydelse**: hold AudioContext enkelt; ingen DSP/effekter i MVP.
* **Låsning**: persona/kontekst kan **ikke** ændres mid-session (krav).

---

# Teststrategi (TDD “hvor muligt”)

* **Trin 0–1**: fuld TDD (API endpoints, env-validering).
* **Trin 2 (Realtime handshake)**: delvis TDD (backend token-endpoint); UI-delen kræver manuel acceptance (medie-tilladelser).
* **Trin 3–4 (audio)**:

  * Automatisér kun det, der kan måles deterministisk: at filer skabes og vokser.
  * Lydkvalitet og latens verificeres manuelt (korte checklister).
* **Trin 6 (transcript)**: TDD for DB-persist; manuel visuel bekræftelse i UI.
* **Playwright “live”**: kør kun når `OPENAI_API_KEY` er sat; tests tagges `@live` og **må ikke** køre i CI uden nøgle.

**Eksempler på tests (kort):**

* `should create session and write mikkel.wav > 0 bytes after 2s`
* `should also write freja.wav when model speaks`
* `should persist at least one message per speaker`
* `should lock persona/context and echo them in session GET`
* `should serve transcript.md with non-empty body`

---

# Runbook (lokalt)

* `pnpm install`
* `cp .env.example .env` (sæt `OPENAI_API_KEY`, `DATABASE_URL=file:./data.db`)
* `pnpm dev:api` + `pnpm dev:web`
* Start session i UI → tal → stop → gå til Historik → download filer.

---

# Definition of Done (MVP)

* Live samtale med Freja, lav latenstid.
* **To separate WAV-spor** optaget og hentbare.
* Live transcript, persist i DB, eksportér JSON/MD.
* Parametre (model/voice/temperatur/VAD) valgt før start, gemt i session.
* Persona/kontekst låst pr. session og anvendt.
* Auto-save/”crash-sikker”: ingen data tabes ved tab-lukning.
* Simpel historikside med fuld visning.

---

# Hvad vi med vilje **ikke** gør i MVP

* Ingen mixdown/rendering i backend.
* Ingen show notes/RSS.
* Ingen multi-gæst/3. spor.
* Ingen avanceret søgning i transcripts.
* Ingen generiske “plugin-systemer”. Kun et lille finish-event hook.

---
