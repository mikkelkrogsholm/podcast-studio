# TRIN 12 — Add-on hook points (uden features)

## Intro
Forbered små, konkrete hook-punkter, så fx show notes/RSS kan kobles på senere. Ingen features implementeres nu.

## Krav / mål
- Intern event “session:completed”
- No-op subscriber (kan udvides senere)

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: emitter kaldes ved `/finish` med korrekt payload
- [ ] Vitest: ingen sideeffekt (no-op)

### B) Implementering
- [ ] Emitter (tiny event bus) i `packages/shared`
- [ ] API: kald emitter efter succesfuld finish
- [ ] Registrér no-op subscriber i api bootstrap

### C) Verifikation
- [ ] Logs viser event fired (dev)

### D) Definition of Done
- [ ] Hook eksisterer, gør intet, klar til modul senere

## Parallelisering
- [ ] Event-bus og finish-wire kan laves parallelt
