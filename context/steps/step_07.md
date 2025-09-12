# TRIN 7 — Basis-kontroller (model, voice, temperatur, VAD)

## Intro
Playground-lignende kontroller vælges **før** session start og gemmes i DB. Session bruger netop disse værdier.

## Krav / mål
- Formular med: model, voice, temperature, top_p, language, silence_ms
- Persist i `sessions`
- Anvendes ved Realtime init

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: `POST /session` med payload → `GET /session/:id` matcher præcist felter
- [ ] Playwright: vælg custom værdier i UI → start → check visning og db

### B) Implementering
- [ ] Zod schema for settings (defaults)
- [ ] UI formular + local validation
- [ ] Backend: gem settings og brug dem i init-call

### C) Verifikation
- [ ] Start session, log init payload (dev) → værdier korrekte

### D) Definition of Done
- [ ] Settings låst pr. session, konsistent brugt

## Parallelisering
- [ ] UI formular + backend validering parallelt
