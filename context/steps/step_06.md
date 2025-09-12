# TRIN 6 — Transcript (live + persist)

## Intro
Vis og gem live-transcript for Mikkel (ASR) og Freja (modeltekst). Minimum: tekst ruller i UI og persist i DB.

## Krav / mål
- Løbende `messages` med `speaker`, `text`, `ts_ms`
- Live UI-panel
- Eksakt rå event i `raw_json`

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: indsæt `message` med zod-validated payload → læs tilbage sorteret på `ts_ms`
- [ ] Playwright: sig sætning → se din tekst; Freja svarer → se hendes tekst; `messages.count >= 2`

### B) Implementering
- [ ] Integrér Realtime text-events (ASR+model) → normaliser `speaker`, `ts_ms`
- [ ] API: `POST /session/:id/event` (fallback) + direkte persist ved websocket callbacks
- [ ] UI: “Transcript” midterpanel (autoscroll)

### C) Verifikation
- [ ] Check DB: korrekt speakers, tidsstempler
- [ ] UI ruller uden jumps

### D) Definition of Done
- [ ] Live transcript og persist fungerer

## Parallelisering
- [ ] Event-normalisering, DB-persist, UI-visning kan opdeles
