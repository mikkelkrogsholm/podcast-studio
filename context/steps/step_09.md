# TRIN 9 — Download & eksport

## Intro
Én-klik download af `mikkel.wav`, `freja.wav`, samt transcript som JSON/Markdown.

## Krav / mål
- `GET /file/:speaker` streamer WAV
- `GET /transcript.json|.md` genererer fra DB

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: download endpoints returnerer 200 + korrekt content-type
- [ ] Vitest: transcript.md ikke tom
- [ ] Playwright: klik downloads → filer gemmes

### B) Implementering
- [ ] API: send filstream med headers
- [ ] API: generér MD fra `messages` (rolle, tidsstempel)
- [ ] UI: download-knapper

### C) Verifikation
- [ ] Åbn filer i DAW/Editor; indhold OK

### D) Definition of Done
- [ ] Downloads fungerer stabilt

## Parallelisering
- [ ] File streaming og MD-generator kan laves parallelt
