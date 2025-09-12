# TRIN 2 — Realtime handshake (WebRTC/WebSocket)

## Intro
Etabler klientforbindelse til OpenAI Realtime via token. Viser “Connected” og logger simple events. Ingen lyd endnu.

## Krav / mål
- Klik “Connect” → aktiv Realtime-session
- Event-log i UI (seneste status)

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest (api): smoke-test mod OpenAI REST `GET /models` (for at sikre nøglen lever)
- [ ] Playwright: klik “Connect” → UI viser “Connected” inden for X sekunder

### B) Implementering
- [ ] Web: `Connect` henter token → starter WebRTC (eller WS fallback) til Realtime
- [ ] UI: lille logpanel med “connecting/connected/disconnected” events
- [ ] Clean-up på unmount

### C) Verifikation
- [ ] Manuelt: se “Connected” uden fejl i konsol
- [ ] Playwright-test grøn

### D) Definition of Done
- [ ] Stabil forbindelse
- [ ] Event-log opdateres

## Parallelisering
- [ ] WebRTC-klientkode og UI-log kan laves parallelt
- [ ] Backend-smoketest uafhængig
