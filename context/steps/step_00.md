# TRIN 0 — Repo-skelet & kvalitet

## Intro
Sæt et minimalt monorepo op med web + api + shared, SQLite + migrations, lint/test tooling. Ingen OpenAI, ingen audio, kun “det kører”.

## Krav / mål
- Monorepo: `apps/web`, `apps/api`, `packages/shared`
- SQLite initialiseret
- Lint + formatter + tests kører
- Health endpoint svarer

---

## Tasks (TDD-first)

### A) TESTS (skrive først – de skal fejle)
- [ ] Opret Vitest i `apps/api` med test: `GET /health` returnerer `{ ok: true }`.
- [ ] Opret Vitest test for DB-init: `can run a migration and read pragma user_version`.
- [ ] Opret Playwright e2e i `apps/web`: loader forsiden og viser “App ready”.
- [ ] Tilføj GitHub Actions workflow: kører `pnpm lint` + `pnpm test` på PR.

### B) Implementering
- [ ] Opret repo-struktur:
  - [ ] `apps/api` (Fastify/Express + TypeScript strict)
  - [ ] `apps/web` (Next.js + TypeScript strict)
  - [ ] `packages/shared` (tsconfig, zod utils)
- [ ] ESLint + Prettier konfigureres i roden (TS strict)
- [ ] `apps/api`: route `GET /health` → `{ ok: true }`
- [ ] Tilføj Drizzle (eller Prisma) + SQLite:
  - [ ] Opret DB-klient og første tom migration
  - [ ] Kør migration ved server start
- [ ] `apps/web`: minimal side der skriver “App ready”

### C) Verifikation
- [ ] `pnpm -w lint` → 0 fejl
- [ ] `pnpm -w test` → alle tests grønne
- [ ] Start api + web → `GET /health` returnerer OK; forsiden loader

### D) Definition of Done
- [ ] Monorepo kører lokalt
- [ ] Tests + lint i CI
- [ ] DB er initialiseret uden fejl

## Parallelisering
- [ ] API-skelet og DB-setup kan laves parallelt
- [ ] Web-skelet og CI kan laves parallelt
