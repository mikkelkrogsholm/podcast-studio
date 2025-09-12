# TRIN 11 — Session-liste & detaljer

## Intro
Historik-side der viser alle sessioner og giver adgang til detaljer, transcript og filer.

## Krav / mål
- `GET /session` → liste (seneste først)
- Detaljevisning: metadata, prompts, settings, links til filer

---

## Tasks (TDD-first)

### A) TESTS
- [ ] Vitest: liste returnerer i korrekt sortering
- [ ] Playwright: klik på session → ser alle felter og links

### B) Implementering
- [ ] API: pagination (simpel), sortering
- [ ] Web: liste med søjler (titel, dato, varighed, status)
- [ ] Detaljeside: fuldt overblik

### C) Verifikation
- [ ] UI responsiv og stabil

### D) Definition of Done
- [ ] Kan finde og åbne tidligere sessioner

## Parallelisering
- [ ] API-liste og Web-liste kan udvikles parallelt
