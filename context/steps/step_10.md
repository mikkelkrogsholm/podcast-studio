# TRIN 10 — Robusthed: stop/retry/interrupt

## Intro
Pæn session-lukning, mulighed for at afbryde Frejas tale, simple reconnect-strategier.

## Krav / mål
- “Stop” lukker recorders, `finish`-endpoint, lukker Realtime
- “Interrupt” stopper AI-udtale
- Reconnect (1–2 forsøg) ved drop

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: `POST /finish` sætter `completed_at` + opdaterer `audio_files.duration_ms`
- [ ] Playwright: under AI-tale → klik “Interrupt” → tal ophører, event logges

### B) Implementering
- [ ] UI knapper: Stop, Interrupt
- [ ] Backend: `POST /finish` finaliserer, flush WAV-headers
- [ ] Reconnect: exponential backoff (kort)

### C) Verifikation
- [ ] Stop producerer komplette afspillelige filer
- [ ] Interrupt svarer snapt

### D) Definition of Done
- [ ] Stabil afslutning og afbrydelse

## Parallelisering
- [ ] Finish-endpoint uafhængig af UI
- [ ] Interrupt-wire op uafhængigt
