# TRIN 3 — Lokal mic-capture (Mikkel-spor) + upload

## Intro
Optag Mikkels mikrofon i browseren, gem i chunks på backend som `mikkel.wav`. Ingen AI-lyd endnu.

## Krav / mål
- MediaRecorder fra mic (48 kHz, mono, PCM16/WAV)
- Streaming upload i chunks til `/audio/mikkel`
- Fil vokser under optagelse

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Playwright: start session → giv mic-tilladelse → tal 3s → stop → assert `mikkel.wav` > 0 bytes
  - Brug Chromium flags: `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=test.wav`
- [ ] Vitest (api): append-chunks → finaliser WAV-header korrekt

### B) Implementering
- [ ] API: `POST /api/session` opretter session-række + `audio_files` for mikkel
- [ ] Web: `getUserMedia({audio:true})` → `MediaRecorder` (WAV/PCM)
- [ ] `ondataavailable`: POST chunk → append på server
- [ ] API: stream-append + flush ved stop

### C) Verifikation
- [ ] Lyt til `mikkel.wav` lokalt → hør lyd
- [ ] DB `audio_files` har metadata (størrelse, varighed efter stop)

### D) Definition of Done
- [ ] Stabil optagelse + upload
- [ ] Fil kan afspilles

## Parallelisering
- [ ] API-upload-endpoint og fil-writer kan laves parallelt
- [ ] Web MediaRecorder + uploader kan laves parallelt
