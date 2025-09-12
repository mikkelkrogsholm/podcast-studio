Her er en **enkel Git-strategi** til jeres projekt. Den er stram, uden over-engineering, forklaret i dagligdags sprog.

# Målet

* **Simpel**: Én hovedgren, korte feature-grene, små pull requests.
* **Stabil**: Alt på `main` skal altid bygge, teste og køre.
* **Sporbar**: Hver ændring har en lille, tydelig besked og et lille diff.

---

## 1) Branch-model (så lidt som muligt)

* **`main`**: sandheden. Altid grøn (bygger og består tests).
* **Feature-grene**: korte grene fra `main`, fx
  `feat/trin-03-mic-uploader`, `fix/transcript-scroll`, `chore/ci`.
* **Ingen** `develop`/`staging`/lange release-grene. Hold det fladt.

**Navngivning**

* `feat/…` for nye ting, `fix/…` for fejl, `chore/…` for vedligehold, `docs/…` for dokumentation, `test/…` for testrelateret.
* Brug små bogstaver og bindestreger.

---

## 2) Dagligt arbejdsflow (trin-for-trin)

1. **Opdatér lokalt**

   ```bash
   git checkout main
   git pull --ff-only
   ```

2. **Opret feature-gren**

   ```bash
   git checkout -b feat/trin-03-mic-uploader
   ```

3. **TDD-cyklus**

   * Skriv test → kør test (fejler) → implementér mindst muligt → kør test (grøn).
   * Gem ofte:

     ```bash
     git add -A
     git commit -m "feat(mic): start MediaRecorder og sender chunks til /audio/mikkel"
     ```

4. **Synkronisér kort** (hvis `main` er løbet foran):

   ```bash
   git fetch origin
   git rebase origin/main   # ren historie, ingen merge-rod
   ```

5. **Push og PR**

   ```bash
   git push -u origin feat/trin-03-mic-uploader
   ```

   Opret **lille** Pull Request (PR). Den må gerne være “Draft”, til CI har kørt.

6. **Squash-merge** når grønt

   * På PR’en: vælg *Squash and merge*.
   * Giver én pæn commit på `main` med klar besked.

---

## 3) Commit-stil (enkelt og konsekvent)

* Skriv i **bydeform** og **nutid**: “tilføj”, “ret”, “opdatér”.
* Én logisk ændring pr. commit. Hellere 3 små end 1 stor.
* Format (inspireret af “conventional commits”, uden at blive religiøs):

  ```
  feat(mic): start MediaRecorder og upload i 2s-chunks

  - init MediaRecorder 48k mono
  - POST /api/session/:id/audio/mikkel
  - basic fejlhaandtering ved netværksdrop
  ```

---

## 4) Pull Requests (små og kontante)

**Krav før merge**

* CI grønt: lint + enhedstests + evt. e2e.
* PR-beskrivelse: 2–5 linjer, hvad og hvorfor (ingen roman).
* Ingen “drive-by” refaktorering. Kun det PR’et lover.

**Review-tjekliste (hurtig)**

* [ ] Test dækker ændringen og fejler uden koden.
* [ ] Koden er den **mindst mulige** for at bestå testen.
* [ ] Navne er klare. Ingen døde filer.
* [ ] Ingen hemmeligheder (.env osv.) i diff.
* [ ] Store filer/artefakter er ikke committed.

---

## 5) Releases (manuelt og simpelt)

* Når I vil “klippe” en version, tagger I `main`:

  ```bash
  git checkout main
  git pull --ff-only
  git tag -a v0.1.0 -m "MVP: dual-track optagelse + transcript + auto-save"
  git push origin v0.1.0
  ```
* Brug **semantisk versionering** i korte træk:

  * **MAJOR**: inkompatible ændringer
  * **MINOR**: nye funktioner bagudkompatibelt
  * **PATCH**: fejlrettelser

---

## 6) Hotfix (akut fejl på produktion)

* Gren fra `main`:

  ```bash
  git checkout main && git pull --ff-only
  git checkout -b fix/hotfix-transcript-crash
  ```
* Ret, test, PR, **squash-merge** til `main`, patch-tag fx `v0.1.1`.

---

## 7) Store filer og output (undgå rod)

* **Commit aldrig** audio-output, transiente sessionfiler, build-artefakter.
* Sørg for `.gitignore` indeholder fx:

  ```
  /sessions/
  /data/
  *.wav
  *.mp3
  .env
  .env.local
  .DS_Store
  dist/
  .next/
  ```
* Commit **kun** kode, migreringer, schemaer, konfiguration, små tekstprøver.

---

## 8) Branch-beskyttelse (to klik, stor effekt)

* Beskyt `main`:

  * Kræv grønt CI før merge.
  * Kræv *squash merge*.
  * Slå “Allow merge commits” fra (hold historien lineær).
  * Valgfrit: kræv mindst 1 godkendelse.

---

## 9) Konflikter og opdatering

* Rebase for at undgå ekstra “merge commits”:

  ```bash
  git fetch origin
  git rebase origin/main
  # Løs konflikter, fortsæt:
  git add -A
  git rebase --continue
  ```
* Push efter rebase kræver force-with-lease (sikker):

  ```bash
  git push --force-with-lease
  ```

---

## 10) Små huskeregler

* Start **altid** fra frisk `main`.
* **Små PRs** (maks \~300 linjer ændring, som tommelfingerregel).
* **Én PR = én idé**. Hvis du rører flere ting, del det op.
* Skriv tests først, når det kan lade sig gøre.
* Fjern feature-gren **efter merge** (GitHub gør det automatisk).

---

### Mikro-cheatsheet

```bash
# ny opgave
git checkout main && git pull --ff-only
git checkout -b feat/trin-06-transcript

# arbejde
git add -A
git commit -m "feat(transcript): vis live og persist i messages"
git push -u origin feat/trin-06-transcript

# hold opdateret
git fetch origin
git rebase origin/main
git push --force-with-lease

# afslut PR (på GitHub): Squash and merge
```

Det er det. Enkelt, hurtigt, og svært at køre i hegnet med. Når I vil, kan vi tilføje en lille `CONTRIBUTING.md` med ovenstående i kortform, så alle AI-agenter og mennesker følger samme rytme.
