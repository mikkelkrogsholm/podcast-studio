# TRIN 8 — Persona (system) + Dagens kontekst

## Intro
Lås persona pr. session; dagskontekst sættes inden start. Begge gemmes og bruges i modellen.

## Krav / mål
- Tekstfelter: `persona_prompt`, `context_prompt`
- Persist + vis badge “Persona låst”
- Sendes til Realtime i init

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: `POST /session` med persona/kontekst → `GET /session/:id` matcher strenge (eksakt)
- [ ] Playwright: udfyld, start → UI viser badge; svar matcher tonen

### B) Implementering
- [ ] UI-felter + længdebegrænsning
- [ ] Backend: gem + injicer i Realtime init
- [ ] UI badge: “Persona låst (session)”

### C) Verifikation
- [ ] Manuelt: oplev forventet tone/kontekst i svar

### D) Definition of Done
- [ ] Persona/kontekst låst og anvendt korrekt

## Parallelisering
- [ ] UI og backend kan kodes uafhængigt
