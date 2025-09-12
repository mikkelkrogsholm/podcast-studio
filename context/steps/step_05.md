# TRIN 5 — Auto-save & crash-sikkerhed

## Intro
Gem alt løbende. Session kan genfindes, selv hvis browseren lukkes midt i optagelse.

## Krav / mål
- Heartbeat til backend (keepalive)
- Status `active`/`completed`
- Genåbning viser session med eksisterende filer/events

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Playwright: start, tal 5s, luk tab uden stop → genåbn → historik viser session med `mikkel.wav` > 0
- [ ] Vitest: sessions markeres “incomplete” efter N sek. uden heartbeat

### B) Implementering
- [ ] Web: send `/keepalive` hver 5–10s (session_id, ts)
- [ ] API: opdater `last_seen_ts`, hvis > timeout → markér `incomplete`
- [ ] `POST /finish`: sæt `completed_at`, status `completed`

### C) Verifikation
- [ ] Lukkes tab, data er stadig der
- [ ] `GET /session/:id` viser status

### D) Definition of Done
- [ ] Ingen datatab ved uventet lukning

## Parallelisering
- [ ] Keepalive og timeout-job uafhængige
- [ ] UI-historikliste parallelt
