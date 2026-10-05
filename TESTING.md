# Manual test checklist

Run `npm run dev` and open <http://localhost:5173>. Work top to bottom.

Legend: **[x]** = verified and passing, **[ ]** = not yet run manually in a browser.

---

## 1. First run and demo data

- [x] **Open in a private/incognito window.** The guided setup wizard appears, no crash, no
      empty white screen, no red error boundary.
- [x] **Wizard step 1** — type an institution name and press Next.
- [x] **Wizard steps 2 and 3** show the room and student counts and the "no rooms yet" /
      "no students yet" empty states.
- [x] **Load demo data** from wizard step 2 → 3 rooms, 26 students appear and the wizard
      exits to the normal app.
- [x] **Load demo data** from Setup → Backup → "✨ Load demo data" → confirm → demo data is
      restored.
- [x] **Skip for now** on the wizard exits without loading data; the app still opens and the
      Setup page is usable.
- [x] **Incognito empty state** — Setup, Exams, Plan, Search and Print each render a
      friendly message instead of crashing.

## 2. Generate a plan

- [x] **Plan → Generate.** Grids appear for all three rooms with utilization bars.
- [x] **24 of 26 students seated** (one room has a broken seat); the unseated count is shown.
- [x] **Generate twice with the same seed** → identical plan.
- [x] **Change the seed** → a different plan, still fully seated.
- [x] **Violations list** explains any constraint that could not be met.
- [x] **Click-to-swap** two seated students; **undo** restores them.
- [x] **Lock** a seat, regenerate → the locked student is still in that seat.

## 3. Search

- [x] **Search by ID** `241-15-1001` → the student is found.
- [x] **Search by Bangla digits** `২৪১-১৫-১০০১` → the same student is found.
- [x] **Search by Bangla name** `নুসরাত জাহান` → found, with extra spaces ignored.
- [x] **Search by partial name** → multiple matches listed.
- [x] **Scope toggle** current exam / all exams → a student on two exams gets two cards,
      earliest first.
- [x] **Seated student** shows room, seat, bench and the ★ seat map.
- [x] **Unseated student** shows the amber "unseated" message, no seat map.
- [x] **Exam with no plan** shows the "no plan" message rather than an error.
- [x] **Admit slip** prints for a single student.

## 4. Language switching — every page

- [x] **Setup** — all labels, buttons and the import panel switch.
- [x] **Exams** — calendar, list and warnings switch.
- [x] **Plan** — options, grid captions and violations switch.
- [x] **Search** — field, scope toggle, cards and slip switch.
- [x] **Print** — document buttons and headings switch.
- [x] **Digits follow the language** — `1234` becomes `১২৩৪` in Bangla and back in English.
- [x] **Dates format per locale** — 12 May 2026 / ১২ মে ২০২৬.
- [x] **Switching language never loses state** — the plan stays generated.

## 5. Persistence

- [x] **Generate a plan, then refresh (F5).** The plan, rooms, students and the selected
      exam are all still there.
- [x] **Language survives refresh.**
- [x] **Dark mode survives refresh.**
- [x] **Export backup → refresh → import backup** restores the same data.
- [x] **Incognito after a refresh** still starts clean at the wizard.

## 6. Print preview of each output

- [x] **Room grid** — one page per room, seat colours and broken seats kept.
- [x] **Door sheet** — room name at the top, student list in seat order.
- [x] **Attendance sheet** — signature column present.
- [x] **Admit cards** — exactly 8 per A4 page, nothing clipped at a page edge.
- [x] **Plan CSV** — downloads and opens in a spreadsheet with one row per seat.
- [x] **Print a single admit slip from Search.**
- [x] No app chrome (tabs, buttons) appears in any print output.

## 7. Accessibility and responsiveness

- [x] **Tab through the app** — every control takes focus and shows a visible ring.
- [x] **Seat grid** is announced as a grid with row/column labels.
- [x] **Dark mode** toggle in the header; all text stays readable.
- [x] **Narrow viewport (~360px)** — tables and grids scroll instead of overflowing.
- [x] **Labels** — every input has a visible or associated label.

## 8. Large input

- [x] **Import 5,000 students.** The import completes and the UI stays responsive.
- [x] **Generate a plan for 5,000 students.** Completes in well under a second; no freeze.

---

## 9. Security

- [x] **Import a student named `<img src=x onerror=alert(1)>`** → it displays and
      prints as literal text; nothing executes.
- [x] **Import a CSV over 5 MB** → refused with a friendly "too large" message.
- [x] **Import a CSV with a 5,000-character name** → that row is rejected with the
      max-length reason; the row is not silently truncated.
- [x] **Import a student with ID `__proto__`** → rejected as a reserved key.
- [x] **Import a backup JSON with `"__proto__"` in `plans`** → the prototype is not
      polluted and the app still loads.
- [x] **Set institution name to a 5,000-character string** → it is capped on reload.
- [x] **Corrupt localStorage** (DevTools → `seatplan.state` → `{oops`) → reload shows the
      "Saved data could not be read" banner and the app starts clean instead of crashing.
- [x] **Export the plan CSV with a name `=1+1`** → the cell is prefixed with `'`, so
      Excel shows text rather than a formula.
- [x] **Import an XLSX** → the SheetJS script is SRI-verified; block the network and a
      friendly "could not be loaded" message appears instead of a crash.
- [x] **Footer privacy note** is visible on every page.
- [x] `npm run check:security` passes.

---

## Automated checks

```bash
npm test              # unit tests + i18n key check
npm run lint
npm run build
npm run check:i18n
npm run check:security
npm audit             # 0 vulnerabilities
```

## Known issues / not covered

- XLSX import needs network access to the SheetJS CDN. CSV import is fully offline.
  The CDN failure path shows a friendly error rather than crashing.
- PDF output depends on the browser's print dialog; "Save as PDF" is the user's choice.
- Undo/redo history is in-memory and is lost on a page reload.
- Drag and drop is not touch-friendly; click-to-swap covers touch.
- Broad search queries are capped at 30 matches.
