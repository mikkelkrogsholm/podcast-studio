# Nordic UI Topbar + Human/AI Update

## Overview
A compact, Nordic‑styled topbar consolidates core controls: recording, connection, sessions toggle, settings modal, and live audio levels. The UI now uses neutral speaker labels (Human/AI) and provides i18n tooltips for all icons. The backend accepts both legacy (mikkel/freja) and new (human/ai) speaker keys.

## Purpose
- Simplify the primary workflow: connect, adjust settings, record, monitor levels.
- Make the project open‑source friendly with neutral speaker names (Human/AI).
- Improve UX and a11y with clear iconography, tooltips, and dynamic `html lang`.

## How It Works
- Topbar (card)
  - Record/Pause/Stop: left‑aligned circular icon buttons.
  - Connection: Plug icon toggles connect/disconnect; color denotes state (green/yellow/red).
  - Sessions toggle: shows/hides session history (state persisted in `localStorage`).
  - Settings: Gear icon opens a modal with the full `SettingsForm`.
  - Live levels: centered mini meters for Human/AI with per‑track mute.
- Settings Modal
  - Opens from topbar, leverages existing `SettingsForm`; values persist as før.
- I18n + lang
  - New i18n keys for toolbar/tooltips; `LanguageProvider` persists language and updates `<html lang>`.
- Speakers (Human/AI)
  - UI shows Human/AI labels everywhere (transcript, levels, uploads, finalize).
  - Backend endpoints accept `mikkel|freja` (legacy) and normalize to `human|ai`.
- Files on disk
  - New sessions write `sessions/{id}/human.wav` and `sessions/{id}/ai.wav`.
  - Legacy files (`mikkel.wav` / `freja.wav`) are still read/finalized via compatibility logic.

## Important Files & Components
- UI
  - `apps/web/src/components/TopBar.tsx`: Topbar (icons, levels, tooltips, mute).
  - `apps/web/src/ui/Tooltip.tsx`: Accessible tooltip wrapper.
  - `apps/web/src/ui/Modal.tsx`: Generic modal used for settings.
  - `apps/web/src/contexts/LanguageContext.tsx`: i18n (new keys), persist + dynamic `html lang`.
  - `apps/web/src/hooks/useDualTrackRecording.ts`: Human/AI, pause/resume, mute, `/human|/ai` uploads, finalize.
  - `apps/web/src/hooks/useRealtimeConnection.ts`: Transcript messages as `human|ai`.
  - `apps/web/src/components/Transcript.tsx`: Human/AI labels and styling.
  - `apps/web/src/app/page.tsx`: Wires Topbar, modal, transcript, sessions.
  - `apps/web/src/app/globals.css`: Nordic tokens/utilities.
  - `apps/web/src/app/icon.svg`: Lucide‑inspired Mic favicon.
  - `context/NORDIC-UI-DESIGN.md`: Icon policy (no emojis) + tokens.
- Backend
  - `apps/api/src/server.ts`: Accepts legacy/new speakers, normalizes to `human|ai`; resolves legacy file paths.
- Shared Types
  - `packages/shared/src/index.ts`: Message schema uses `human|ai` (request accepts legacy).
- Tests
  - API: `apps/api/src/routes/*.test.ts` and `apps/api/tests/*.ts` updated for `human/ai` and compatibility.
  - Web E2E: `apps/web/e2e/*.spec.ts` aligned to topbar/aria‑labels; `apps/web/playwright.config.ts` starts dev server automatically.

## Endpoints & Compatibility
- Upload: `POST /api/audio/:sessionId/:speaker` where `:speaker` ∈ { `human`, `ai`, `mikkel`, `freja` }.
- Finalize: `POST /api/audio/:sessionId/:speaker/finalize` (same speaker set; normalized to `human|ai`).
- Info: `GET /api/audio/:sessionId/:speaker/info` (accepts legacy/new; returns normalized DB data).
- Session create: returns legacy keys `mikkelAudioFile`/`frejaAudioFile` for compatibility; path values may point to `human.wav`/`ai.wav`.

## Run & Test
- Dev
  - API: `pnpm dev:api`
  - Web: `pnpm dev:web`
- API tests: `pnpm --filter @podcast-studio/api test`
- Web E2E
  - Install browsers once: `pnpm --filter @podcast-studio/web exec playwright install chromium`
  - Run: `pnpm --filter @podcast-studio/web test:e2e` (auto‑starts Next on 4200)

## Notes
- Pause drops upload chunks (creates a gap by design).
- To fully migrate existing DB rows/file names from mikkel/freja → human/ai, add a one‑off migration; APIs already handle both forms.
