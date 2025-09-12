# TRIN 4 — AI-output som separat spor (Freja-spor)

## Intro
Modtag Realtime-lyd (Freja) via WebRTC, afspil live og optag som separat `freja.wav` samtidig.

## Krav / mål
- Remote AudioTrack → afspilning i UI
- Samme track routes til MediaRecorder → upload i chunks til `/audio/freja`
- To uafhængige spor (mikkel/freja)

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Playwright: prompt modellen til kort svar → hør lyd (headset) → `freja.wav` > 0 bytes
- [ ] Vitest: begge `audio_files` rækker oprettes og opdateres (size > 0)

### B) Implementering
- [ ] WebRTC: fang remote `AudioTrack`
- [ ] Web Audio API: `MediaStreamDestination` for at route til MediaRecorder
- [ ] MediaRecorder for Freja → POST chunks `/audio/freja`
- [ ] UI: volumenmeter og simple mute-knapper

### C) Verifikation
- [ ] Afspil `freja.wav`: kvalitet OK
- [ ] Samtidig optagelse af begge spor uden drop

### D) Definition of Done
- [ ] To separate, komplette WAV-filer

## Parallelisering
- [ ] Remote-track routing og uploader uafhængigt af mic-kode
- [ ] UI-lydindikatorer parallelt
