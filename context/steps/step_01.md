# TRIN 1 — OpenAI-tilslutning (ephemeral token endpoint)

## Intro
Backend forbinder til OpenAI og udsteder kortlivede session-tokens til Realtime-handshake. Ingen lyd endnu.

## Krav / mål
- `POST /api/realtime/token` returnerer et kortlivet token
- Env-validering af `OPENAI_API_KEY`
- Ingen nøgler i klienten

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: `POST /api/realtime/token` med korrekt server-env → 200 + token-format
- [ ] Vitest: fejler 401 hvis `OPENAI_API_KEY` mangler
- [ ] Web e2e (Playwright): knap “Hent token” → viser token modtaget i UI

### B) Implementering
- [ ] Zod/env-validering ved server-start, crash hvis mangler
- [ ] Implementér `POST /realtime/token` (følg OpenAI-docs for ephemeral token)
- [ ] Web: simpel side med “Hent token” (fetch → vis token)

### C) Verifikation
- [ ] Kald endpoint med curl → ser token
- [ ] Playwright test bliver grøn

### D) Definition of Done
- [ ] Token endpoint virker, ingen secrets i browseren
- [ ] Tests grønne

## Parallelisering
- [ ] Env-validering og token-endpoint kan laves parallelt
- [ ] Frontend-knap + UI kan laves parallelt
