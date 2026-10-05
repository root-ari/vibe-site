# SeatPlan — Exam Seat Planner

A bilingual (English / বাংলা) seat-planning app for exam offices. Generate deterministic
seat plans across multiple exams and rooms, edit them by hand, print the room grids and
admit cards, and let students look up their own seat.

**All data stays in your browser.** There is no server, no account and no database.
Everything is stored in `localStorage` on this device only.

---

## Screenshots

| | |
|---|---|
| **Setup** — institution, exam and room details, plus import and backup | ![Setup](docs/setup.png) |
| **Plan** — generated room grids with per-room utilization and violations | ![Plan](docs/plan.png) |
| **Search** — a student finds their room, seat and bench | ![Search](docs/search.png) |
| **Print** — room grid, door sheet, attendance sheet and admit cards | ![Print](docs/print.png) |

> Screenshots live in [`docs/`](docs/). To refresh them, run `npm run dev` and capture
> the five tabs listed in [TESTING.md](TESTING.md).

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run the unit tests, then the i18n key check |
| `npm run lint` | Oxlint |
| `npm run check:i18n` | Fail on missing, duplicate or empty translation keys |
| `npm run check:security` | Fail on raw-HTML sinks, unpinned CDN scripts or committed secrets |

The app needs no configuration, no API keys and no environment variables.

---

## Usage guide

On first run a **guided setup wizard** walks through four steps: institution, rooms,
students, generate. You can import a file or load the demo data at any step, and you can
skip ahead. After that the app has five tabs.

### 1. Setup

- **Institution** — name and logo. These appear on every printed sheet.
- **Exam** — id, title, date, start/end time, and the student roster for that exam.
- **Rooms** — name, building, rows, columns, seats per bench, and broken seats.
- **Rooms & students** — import from CSV or XLSX with a column-mapping step, or edit the
  tables inline.
- **Backup** — export everything as JSON, or import a backup from another machine.
- **Load demo data** — replaces everything with 3 rooms and 26 students.

### 2. Exams

Create and schedule many exams. The calendar marks each exam's date and warns when two
exams overlap in time or try to use the same room.

### 3. Plan

Pick the exam and press **Generate**. The engine:

- orders students by **roll number** or **shuffle** (deterministic for a given seed),
- retries with a new shuffle and keeps the best-scoring attempt,
- avoids seating students of the same course side by side, front to back, or in the same
  department when those constraints are on,
- seats special-needs students in the front row,
- respects broken seats, locked seats and skipped benches/columns,
- reports any constraint it **could not** satisfy instead of hiding it.

Then edit by hand: click-to-swap two seats, drag and drop, mark a seat locked, mark a
student absent or special-needs, and undo/redo. Locked seats survive a regeneration.

### 4. Search

Students search by ID or name. Matching ignores case and extra spaces, and **Bangla
digits are converted to Latin**, so `২৪১-১৫-১০০১` finds `241-15-1001`, and a Bangla name
typed in any form still matches. Results show the room, seat, bench and a small seat map,
and can print a single admit slip.

### 5. Print

Print or save as PDF:

- **Room grid** — the seating chart per room
- **Door sheet** — the list to stick on the door
- **Attendance sheet** — one row per seat for signing
- **Admit cards** — 8 per A4 page
- **Plan CSV** — the full plan as a spreadsheet

Set "Save as PDF" as the destination in the print dialog to keep a digital copy.

---

## Data format

### Rooms (CSV/XLSX)

| Column | Required | Notes |
|---|---|---|
| `name` | yes | e.g. `A-101` |
| `building` | no | printed on door sheets |
| `rows` | yes | number of seat rows |
| `cols` | yes | seats per row |
| `seatsPerBench` | no | defaults to all seats in one bench |
| `broken` | no | `row,col` pairs, 1-based, separated by `;` |

### Students (CSV/XLSX)

| Column | Required | Notes |
|---|---|---|
| `id` | yes | student ID, also the roll number for roll order |
| `name` | no | Latin or Bangla |
| `course` | no | used by the same-course constraints |
| `department` | no | used by the department constraint |
| `section` | no | free text |

Blank rows are skipped, IDs are de-duplicated, and a validation report lists every row
that was rejected with the reason. Rejected rows can be downloaded as an error CSV.
Blank and template files are available from the import panel.

UTF-8 and UTF-8-with-BOM files are both handled, so Bangla names survive the round trip.

### Backups (JSON)

The whole app state: institution, exams, rooms, students, plans and invigilators. Export
on one machine, import on another. The format is versioned (`SCHEMA_VERSION`, currently
**4**) and older versions are migrated on load; data from a *newer* version is refused
rather than silently mangled.

---

## Privacy

> **Everything you enter stays in your browser.**

- All data is written to `localStorage` under `seatplan.*` keys. It never leaves the
  device.
- There is **no backend, no database, no analytics and no telemetry**. No request is
  made with your student data.
- Student data is only written to disk when **you** click Export backup or Export CSV.
- The single exception is the optional **XLSX import**, which loads the SheetJS library
  from a public CDN. That request contains no data; **CSV import works fully offline**.
- Clearing your browser's site data, or using a private/incognito window, deletes
  everything. **Export a backup regularly** if the data matters.
- Because the data is local, anyone with access to this browser profile can read it.
  Use a locked-down exam-office machine.

---

## Security

The app has no backend, so the threats are untrusted files, tampered
`localStorage`, and hostile data reaching the DOM. Each is handled explicitly.

**Rendering.** All output is rendered through JSX, so React escapes every value.
There is no `dangerouslySetInnerHTML`, `innerHTML` or `eval` anywhere, including in
the print documents — an imported name like `<img src=x onerror=...>` is displayed
as literal text and never becomes markup. `npm run check:security` fails the build if
any raw-HTML sink is introduced.

**Import validation.** CSV, XLSX and JSON backups are treated as hostile input:

- files are capped at **5 MB**, and an import at **20,000 rows**;
- every field is length-capped (200 characters, 64 for ids) and stripped of control
  characters — over-long values are **rejected with a reason** rather than silently
  truncated into a different student;
- `__proto__`, `constructor` and `prototype` are dropped at every depth during JSON
  parsing and rejected as identifiers, so a crafted backup cannot pollute
  `Object.prototype`;
- room and student collections are capped (500 / 20,000) and clamped to sane ranges;
- an institution logo must be a real base64 `data:image/...` URL within a size cap.

**CSV injection.** On export, any cell starting with `=`, `+`, `-`, `@`, tab or CR is
prefixed with a single quote, so a student named `=cmd|...` cannot execute when the
export is opened in Excel, LibreOffice or Google Sheets.

**localStorage.** Saved data is untrusted: it is re-validated on every load. Corrupt
or unreadable data is discarded, the app starts clean, and the user is shown a banner
explaining the reset instead of the failure being silent.

**Deployment headers.** `vercel.json` sets a Content-Security-Policy with no
`unsafe-inline` and no `unsafe-eval` in `script-src`, plus `X-Content-Type-Options`,
`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, a `Permissions-Policy` that
disables camera/microphone/geolocation, COOP/CORP and HSTS.

**Third-party code.** The only remote script is SheetJS, pinned to an exact version
(`xlsx-0.20.3`) and verified with a Subresource Integrity hash plus
`crossorigin="anonymous"`, so a swapped or compromised CDN file is refused by the
browser. **CSV import works fully offline.**

**No secrets.** The app needs no API keys, tokens or environment variables. None are
committed, and `npm run check:security` greps for common key formats and refuses a
build that introduces one.

---

## Accessibility and responsiveness

- Works from narrow phone widths up to desktop.
- Every input has a real `<label>`; focus rings are always visible on keyboard focus.
- The seat grids expose `role="grid"` / `row` / `gridcell` with a spoken label per seat.
- Body text meets WCAG AA contrast in both light and dark mode.
- Dark mode toggle in the header; the choice is remembered.
- `prefers-reduced-motion` is respected.

## Notes and limits

- Drag and drop is a mouse affordance; on touch screens use click-to-swap instead.
- Undo/redo history lives in memory and is lost on reload.
- PDF output goes through the browser's own print dialog.
- The search list caps broad queries at 30 matches; narrow the query to see the rest.
- Planning 5,000 students takes well under a second, so the page stays responsive.

## Project layout

```
src/
  App.jsx              shell, tabs, Setup page
  SetupWizard.jsx      first-run guided setup
  ExamsPage.jsx        multi-exam scheduling and calendar
  PlanPage.jsx         generation, seat grid, manual edits
  SearchPage.jsx       student lookup and admit slip
  PrintPage.jsx        print documents
  ImportPanel.jsx      CSV/XLSX import with column mapping
  InvigilatorsPanel.jsx
  seating.js           pure seating engine
  exams.js             scheduling, conflicts, calendar
  storage.js           schema, migrations, persistence
  print.js             document builders
  edits.js             manual edit + undo/redo
  invigilators.js      staff allocation
  search.js            lookup logic
  i18n.js              en/bn translations
scripts/
  check-i18n.mjs       translation key check
```

Business logic is kept in pure, tested modules (`*.test.js`) rather than in components.

