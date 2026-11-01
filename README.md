# Reverie Journal

A private, local-first journal that feels like an elegant hardcover diary: a centered ivory page with live margins on both sides for notes, reflections, quotes and questions. The theme is "Fallen Angel": dark romanticism, crescent moons, fine gold rules. All the artwork is original.

No account, no server, no analytics, no AI. Your writing stays in this browser on this computer.

## Open it on Windows

1. Double-click **`Start Reverie.cmd`**. The first run installs dependencies and builds the app, then it opens at <http://localhost:4317>.
2. **Recommended:** in Microsoft Edge, open the address bar's **App available → Install** (or ⋯ → *Apps* → *Install Reverie Journal*). After that, Reverie opens from the Start menu or taskbar in its own window and **works offline, without `Start Reverie.cmd` running**: the service worker keeps a copy of the app itself.

Always use the same address (`localhost:4317`) in the same browser. Browsers store each site's data separately, so a different port or browser shows a different, empty journal.

> ⚠️ **Back up regularly** (Settings → *Download backup*). Clearing browsing data for this site, or uninstalling the browser profile, erases the journal. Reverie reminds you in the journal drawer when your last backup is more than 14 days old.

## Keyboard

The whole app works without a mouse. Press **Ctrl /** inside the app for the full list.

| Keys | Action |
|---|---|
| Ctrl K | Search the journal, or run any command |
| Alt N | New entry |
| Alt J | Journal: calendar, entries, favorites, tags |
| Alt PgUp / Alt PgDn | Previous / next entry |
| Ctrl [ / Ctrl ] | Note in the left / right margin, beside the paragraph with the cursor |
| Esc or Ctrl Enter (in a note) | Back to the page, at that paragraph |
| Ctrl \ | Show / hide margins |
| Ctrl . | Focus mode |
| Ctrl = / Ctrl - | Larger / smaller text |
| Ctrl , | Settings, export, backup & restore |
| ↑ at the start of the text, Enter in the title | Move between title and body |

Browser-reserved keys (Ctrl N, Ctrl T, Ctrl W…) were avoided on purpose, because pages can't override them.

## Styles

Click the **palette** icon in the top bar (or Ctrl K → "Choose your style…") to pick a look. Each style has its own colors in light and dark, its own fonts, page shape, ornaments, desk pattern and page invitations:

| Style | Feel |
|---|---|
| Fallen Angel | Dark romance, moonlight and gold (the default) |
| Rosewater | Soft blush, roses and champagne |
| Grimoire | Candlelight, moss and moon phases |
| Sugar Cloud | Pastel, round and sweet |
| Oak & Leather | Brass, walnut and a good desk |
| Varsity | Bold type, team stripes, game day |
| Emerald Isle | Celtic knots, green hills, old gold |
| The Bronx | Subway tile, marker ink, big city |
| Brownstone | Brick, iron and Brooklyn stoops |

Styles are plain data in `src/themes/aesthetics.ts`. A unit test checks every palette for readable contrast (WCAG AA or better), so a new style can't ship with hard-to-read text. All fonts are bundled, so every style works offline.

## What's in it

- **Writing**: Tiptap rich text (bold, italic, underline, headings, quotes, lists, links), autosave with a status indicator, word count, focus mode, typewriter mode, adjustable size and line spacing, light ("Ivory") and dark ("Nocturne") themes. Animations respect *reduce motion*.
- **Marginalia**: notes in either margin, anchored to stable paragraph ids. You add them with Ctrl [ / Ctrl ], or by hovering beside a paragraph and clicking **+**. Each note has a kind (note, reflection, quote, question). A note starts level with its paragraph, slides down only to avoid the note above it, and a hairline leader connects it to the paragraph. Hovering a note highlights its paragraph, and annotated paragraphs carry a faint marker in the gutter. Notes left empty disappear on their own. Erasing a note with words in it asks first.
- **Entry details** (left margin): date, mood (eight moods), tags, favorite, small reminders.
- **Prompts**: 30 original writing prompts, shown only when you ask (the feather icon or the palette).
- **Journal**: several entries per day, a month calendar with entry markers, filters for favorites and tags, and search across titles, text, tags and margin notes (case- and accent-insensitive).
- **Export**: one entry or the whole journal as Markdown. Margin notes become footnotes on their paragraphs.
- **Backup & restore**: the full journal as validated JSON. Restore can **merge** (the newer copy of each entry wins) or **replace** (your current journal is downloaded first). Restores run in a single transaction, so a bad file changes nothing.
- **Small screens**: below about 1180px the margins fold into a **Margin notes** panel, with notes listed by paragraph.

## Engineering notes

```
src/
  db/          types (versioned models), Dexie schema + migrations, repository, backup, markdown
  editor/      Tiptap editor, ParagraphIds extension, content helpers, editor registry
  marginalia/  layout algorithm, paragraph measurement, margin columns, note cards, notes panel
  state/       Zustand stores (journal data, UI) and the debounced save queue
  components/  page, chrome, drawer, palette, dialogs, ornaments
  lib/         commands, shortcuts, search, prompts, dates
```

**Layers.** The UI calls *commands* and *stores*. Stores call the *repository*. Only the repository and backup modules touch Dexie. The editor never touches persistence: it reports JSON upward.

**Source of truth.** IndexedDB, through Dexie. Entries keep Tiptap JSON plus a derived `plainText` (for search, excerpts and word counts). There are tables for `entries`, `annotations`, `tags` and `preferences`. A brand-new page is a *draft* in memory and is written only once it holds something, so opening the app doesn't pile up empty entries.

**Stable paragraph anchors.** The `ParagraphIds` extension gives every paragraph and heading a `pid` attribute, stored in the document JSON. The id moves with its paragraph through edits, reflow and reordering. Notes never depend on DOM offsets or array indexes. The DOM is used only to find out *where* a pid is on screen right now. Edge cases:
- Splitting a paragraph copies its attributes into both halves. The id stays with the half holding more text, so pressing Enter at the start of an annotated paragraph leaves the notes beside the words.
- Duplicate ids (for example after pasting) are repaired the same way.
- Id assignment is excluded from undo history.
- If a paragraph is deleted or merged away, its notes are **not** deleted or silently moved. They appear under **Detached notes** with *Attach to the paragraph at the cursor*. This keeps undo safe: undoing the deletion brings the paragraph back with its original id, and the notes reattach by themselves.

**Saving.** A keyed, debounced queue (600 ms) writes only the latest version of each record, and a flush never overlaps another. It flushes when you switch entries, export, back up, or blur or hide the window, and on `pagehide`. A failed write stays queued, retries every 5 s, and shows "Couldn't save — retrying" with a *Retry now* link. Ctrl S flushes immediately.

**Migrations.** Dexie versions are append-only. v2 adds `prompt` and `reminders` to entries and `kind` to annotations, with an upgrade function that backfills older records. `migration.test.ts` opens a real v1 database and upgrades it.

**Offline.** A tiny build plugin (`vite.config.ts`) generates `sw.js` with the exact list of built files. The service worker caches the app shell only and never sees journal data. Fonts are bundled locally with `@fontsource`, so nothing loads from the internet.

### Commands

```bash
npm run dev        # development server on :4317
npm run build      # typecheck + production build
npm run app        # serve the build on :4317 and open the browser
npm test           # unit + component tests (Vitest, fake IndexedDB)
npm run e2e        # end-to-end tests (Playwright, using the installed Microsoft Edge)
```

### Tests

- **Unit**: repository CRUD and cascade delete, tag normalization, preferences, the v1→v2 migration, backup round-trip, merge and replace semantics, validation errors, Markdown export (footnotes, escaping, structure), paragraph-id stability (insert, split at start and end, duplicates, undo), margin layout stacking, search ranking, the save queue (debounce, latest-wins, retry), and store flows (drafts, notes on both sides surviving a reload, deletion, navigation).
- **Component**: `NoteCard` editing, kind cycling, confirmed deletion, auto-removal of empty notes.
- **E2E** (against the production build): opening straight onto the page, writing with notes in both margins and reloading, adding a note by clicking in the margin, keyboard navigation and search, Markdown export, backup → delete → restore, rejecting an invalid backup, and working offline.

## Known limitations

- **Anchors are paragraph-level**, by design for this version. A note can't point at a phrase inside a paragraph yet.
- **No encryption.** IndexedDB is not encrypted: anyone using this Windows account and browser profile could read the journal. Password-based encryption (WebCrypto, AES-GCM with a PBKDF2/Argon2-derived key) is a reasonable next step now that reliable backups exist. Losing the password would mean losing the journal, so it needs careful UX.
- **Single device.** There is no sync. Move your journal between machines with backup and restore (merge).
- **Tauri** desktop packaging isn't set up. The architecture is ready for it: no server, all state is local, and fonts and assets are bundled. Until then, Edge's *Install as app* gives a standalone window with offline support.
- Detached notes don't reattach automatically when you merge two paragraphs. You reattach them in one click.
