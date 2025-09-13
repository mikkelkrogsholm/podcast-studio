Nordic UI – Design Spec (MVP)

Formål
- Giv podcast-studiet et lyst, roligt “Nordic” look med høj læsbarhed og minimale distraktioner.
- Skab genbrugelige primitives (Card, Button, Input …) og design tokens, så vi hurtigt kan udvide og holde konsistens.

Principper
- Neutrale flader i lag: canvas → surface → elevated.
- Bløde kanter og diskrete skygger (soft, inset) for dybde uden støj.
- Få farver: mørk blågrå “ink”, afdæmpet accent, ellers gråtone.
- Tydelige fokus‑states (ring) og AA‑kontrast.

Design Tokens (CSS vars)
- Farver
  - `--bg-canvas: #ececea` (grundflade)
  - `--bg-surface: #f7f7f6` (cards)
  - `--bg-elevated: #efefee` (inputs/controls)
  - `--ink: #2b2f33` (primær tekst)
  - `--ink-muted: #5b6168` (sekundær tekst)
  - `--accent: #3b5566` (knapper/fokus)
  - `--accent-contrast: #ffffff`
  - `--border: rgba(0,0,0,0.08)` (hårfine kanter)
  - `--ring: rgba(59,85,102,0.35)` (fokusring)
- Radii
  - `--radius-card: 16px`
  - `--radius-control: 12px`
  - `--radius-pill: 9999px`
- Shadows
  - Soft: `0 1px 0 rgba(0,0,0,.02), 0 8px 16px rgba(0,0,0,.06)`
  - Inset: `inset 0 1px 3px rgba(0,0,0,.06)`

Utility‑klasser (globals)
- Farver: `.bg-canvas`, `.bg-surface`, `.bg-elevated`, `.text-ink`, `.text-ink-muted`, `.border-ui`, `.ring-accent`
- Skygger: `.shadow-soft`, `.shadow-inset`
- Komponentbaser: `.card`, `.control`, `.focus-ring`, `.transition-ui`
- Slider: `.slider` (input[type=range])

UI‑Primitives (src/ui)
- `Card`: wrapper til indhold, valgfri header/footer.
- `Button`: varianter `primary | subtle | ghost | danger`.
- `Input`, `TextArea`, `Select`: standardkontroller med `control` + `shadow-inset` og fokusring.
- `Checkbox`, `Radio`: simple native inputs med `accent-color`.
- `Slider`: minimal range‑styling (bruges til volume mv.).
- `Badge`: små statuschips (neutral/success/warning/danger).

Layout
- Grid: `grid grid-cols-[260px_1fr]` på ≥md, med `Sidebar` i venstrekolonnen.
- `Sidebar`: titel, simple nav‑punkter, sprogskifter.
- Hovedindhold som stak af `Card`s: Settings, Recording, Audio Levels, Transcript, Connection, Sessions.

Komponent‑mapping
- SettingsForm → Input/Select/TextArea primitives; fejl vises som små røde tekster.
- Recording → `Button` varianter (`primary` start, `danger` stop), status i muted tekst.
- DualTrackControls → `VolumeIndicator` i `bg-elevated`, diskrete bars, tydelig Mute.
- Transcript → header + bobler (Mikkel: accent‑kant, Freja: lys grøn nuance), timestamps som `text-ink-muted`.
- SessionHistory → kort med `border-ui`, badges for status, handlinger som `subtle`/gule knapper.

Tilgængelighed
- Fokus: `.focus-ring` på alle interaktive elementer.
- Kontrast: mindst AA – justér `--accent` mørkere hvis behov.
- Motion: `transition-ui` (200ms), ingen overdrevne animationer.

Teknik
- Tailwind v4 aktiveret via `@import "tailwindcss"` i `apps/web/src/app/globals.css`.
- PostCSS: `tailwindcss`, `autoprefixer` (apps/web/postcss.config.js).
- Tokens og utils defineres i CSS (ingen kompleks Tailwind‑config nødvendigt i v4).

Kode‑placering
- Tokens/Utilities: `apps/web/src/app/globals.css`
- Primitives: `apps/web/src/ui/*`
- Layout: `apps/web/src/components/Sidebar.tsx`, `apps/web/src/app/page.tsx`

Udvidelser (senere)
- Temaer: læg alternative tokens under `.theme-dark` eller `@media (prefers-color-scheme)`.
- Storybook/Docs: evt. let komponentkatalog.

Ikoner (valg og regler)
- Bibliotek: `lucide-react` (MIT, letvægt, konsistent linjeikonografi, god dækning af handlinger som settings, connect, record/pause/stop, sessions/historik).
- Vi bruger aldrig emojis i UI’et. Kun ikoner fra `lucide-react` for et ensartet udtryk.
- Anvendte ikoner (eksempler):
  - Indstillinger: `Settings`
  - Forbindelse: `PlugZap` (farvekodet status: grøn=forbundet, gul=forbinder, rød=fejl/afbrudt)
  - Optag: `Circle` (rød)
  - Pause/Fortsæt: `Pause` (gul/neutral)
  - Stop: `Square`
  - Sessioner: `History`
- Størrelse: 20–24px i topbaren, `text-ink` som standardfarve, statusfarver via tokens.

Favicon
- Favicon leveres som `app/icon.svg` og bruger Lucide‑inspireret `Mic` ikon i Nordic farver (accent på mørk flise, hvid streg).
- Kan skiftes ved at erstatte SVG‑indholdet; hold baggrund og stroke i paletten.

Definition of Done (UI‑delen)
- Tailwind + tokens virker; globale klasser tilgængelige.
- Primitives dækker formularer/knapper/cards.
- Hovedv views (Settings, Recording, Levels, Transcript, Connection, Sessions) renderes i Nordic‑stil.
- Fokus‑stater tydelige; ingen brudte layouts ≥sm.
