---
description: "Kør TDD-loop på en TRIN-fil: git branch, skriv tests, udfør parallelt arbejde med agenter, kør tests, iterer"
argument-hint: [TRIN-fil.md]
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(pnpm test:*), Bash(pnpm run:*), Read, Write, Grep, Glob
---

# Byggeproces for $1

1. **Git setup**
   - Tjek ud fra `main`, træk seneste:
     ```bash
     git checkout main
     git pull --ff-only
     ```
   - Opret feature-branch baseret på filnavnet:
     ```bash
     git checkout -b feat/$(basename $1 .md)
     ```

2. **Læs TRIN-fil**
   - Åbn `$1` og udtræk:
     - Accept-kriterier
     - Tasks opdelt i UI / backend / tests / audio
   - Marker hvilke tasks der kan køres parallelt.

3. **Skriv tests først**
   - Send acceptance til `test-writer` subagent → generér Vitest/Playwright skeletons.
   - Gem filer og kør:
     ```bash
     pnpm test
     ```
   - Bekræft at tests fejler.

4. **Udfør arbejdet parallelt**
   - UI-tasks → `audio-engineer` subagent.
   - Backend-tasks → `backend-surgeon` subagent.
   - Testrelateret → `test-writer` fortsætter.
   - Hver agent skriver kode i egne filer, commit småt:
     ```bash
     git add -A
     git commit -m "wip($1): partial implementation"
     ```

5. **Kør tests**
   - Gentag:
     ```bash
     pnpm test
     ```
   - Hvis rødt → iterér: bed relevante subagent justere.

6. **Afslut**
   - Når alle tests grønne:
     ```bash
     git add -A
     git commit -m "feat($1): implement tasks til grøn suite"
     git push -u origin HEAD
     ```
   - Udskriv: "TRIN $1 fuldført, alle tests grønne, branch klar til PR."
