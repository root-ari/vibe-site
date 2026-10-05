import { useMemo, useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import { downloadCsv } from './parse.js'
import {
  PLAN_CSV_LABEL_KEYS,
  SLIPS_PER_PAGE,
  admitCards,
  attendanceRows,
  buildPrintView,
  chunk,
  doorSheetRows,
  planCsv,
  planCsvFilename,
  studentIndex,
} from './print.js'

const DOCS = ['grid', 'door', 'attendance', 'slips']

// Light tints that still read on paper when the printer keeps background colours.
const PRINT_TINTS = [
  'bg-indigo-50 text-indigo-900 border-indigo-300',
  'bg-emerald-50 text-emerald-900 border-emerald-300',
  'bg-amber-50 text-amber-900 border-amber-300',
  'bg-rose-50 text-rose-900 border-rose-300',
  'bg-sky-50 text-sky-900 border-sky-300',
  'bg-violet-50 text-violet-900 border-violet-300',
]

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const primaryClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const thClass = 'border border-black px-1 py-0.5 text-left text-[10px] font-semibold'
const tdClass = 'border border-black px-1 py-0.5 text-[10px]'

function tintFor(courses, course) {
  return PRINT_TINTS[courses.indexOf(course) % PRINT_TINTS.length]
}

function useCourses(students) {
  return useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.course).filter(Boolean))).sort(),
    [students],
  )
}

/* ----------------------------- pieces ---------------------------- */

function DocHeader({ institution, exam, subtitle }) {
  const { t, d, time } = useLang()
  return (
    <header className="border-b-2 border-black pb-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-bold">
            {institution.name || t('app.untitled')}
          </h1>
          {subtitle && <p className="text-sm font-semibold">{subtitle}</p>}
        </div>
        <div className="text-right text-[10px] leading-tight">
          <p className="text-sm font-semibold">{exam.title || t('app.untitled')}</p>
          <p>
            {t('print.date')}: {d(exam.date) || '—'}
          </p>
          <p>
            {time(exam.startTime)}–{time(exam.endTime)}
          </p>
          <p>{exam.id}</p>
        </div>
      </div>
    </header>
  )
}

function SignatureRows() {
  const { t } = useLang()
  return (
    <div className="mt-8 flex gap-6 text-[10px]">
      {['print.invigilator', 'print.chiefInvigilator', 'print.date'].map((key) => (
        <div key={key} className="flex-1 border-t border-black pt-1">
          {t(key)}
        </div>
      ))}
    </div>
  )
}

function SeatCell({ cell, tint }) {
  const { t, n } = useLang()
  const box = 'flex items-center justify-center border text-center align-middle'

  if (cell.blockedBy === 'broken') {
    return (
      <div
        className={`${box} border-slate-400 bg-slate-300 text-slate-600`}
        style={{ width: '24mm', height: '18mm' }}
        title={t('plan.cell.broken')}
      >
        <span aria-hidden="true">✕</span>
      </div>
    )
  }
  if (cell.blocked) {
    return (
      <div
        className={`${box} border-dashed border-slate-400 bg-slate-100 text-slate-400`}
        style={{ width: '24mm', height: '18mm' }}
        title={t('plan.cell.skipped')}
      >
        <span aria-hidden="true">–</span>
      </div>
    )
  }
  if (!cell.student) {
    return (
      <div
        className={`${box} border-slate-300 text-[9px] text-slate-400`}
        style={{ width: '24mm', height: '18mm' }}
      >
        {n(cell.row)},{n(cell.col)}
      </div>
    )
  }
  return (
    <div
      className={`${box} ${tint} flex-col leading-tight`}
      style={{ width: '24mm', height: '18mm' }}
    >
      <span className="text-[9px] font-semibold">{cell.student.name}</span>
      <span className="text-[8px]">{cell.student.id}</span>
    </div>
  )
}

function GridPage({ room, institution, exam, courses }) {
  const { t, n } = useLang()
  return (
    <section className="print-page avoid-break">
      <DocHeader
        institution={institution}
        exam={exam}
        subtitle={`${room.name || t('app.untitled')} · ${n(room.rows)}×${n(room.cols)}`}
      />
      <div className="mt-3 inline-flex flex-col gap-1">
        {room.cells.map((line) => (
          <div key={line[0].row} className="flex gap-1">
            {line.map((cell) => (
              <SeatCell
                key={cell.col}
                cell={cell}
                tint={cell.student ? tintFor(courses, cell.student.course) : ''}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px]">
        {t('plan.seated')} {n(room.seated)} / {t('plan.capacity')} {n(room.capacity)} ·{' '}
        {t('plan.utilization')} {n(room.utilization)}%
      </p>
      <SignatureRows />
    </section>
  )
}

function DoorPage({ rows, institution, exam, roomName }) {
  const { t } = useLang()
  return (
    <section className="print-page">
      <DocHeader
        institution={institution}
        exam={exam}
        subtitle={`${t('print.room')}: ${roomName}`}
      />
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>{t('print.roll')}</th>
            <th className={thClass}>{t('print.name')}</th>
            <th className={thClass}>{t('print.course')}</th>
            <th className={thClass}>{t('plan.seat')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td className={tdClass}>{row.studentId}</td>
              <td className={tdClass}>{row.name}</td>
              <td className={tdClass}>{row.course}</td>
              <td className={tdClass}>{row.seat}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px]">
        {t('print.total')}: {n(rows.length)}
      </p>
      <SignatureRows />
    </section>
  )
}

function AttendancePage({ rows, institution, exam }) {
  const { t } = useLang()
  const columns = [
    'print.roll',
    'print.name',
    'print.course',
    'print.room',
    'print.seat',
    'print.signature',
  ]
  return (
    <section className="print-page">
      <DocHeader
        institution={institution}
        exam={exam}
        subtitle={t('print.attendanceNote')}
      />
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr>
            {columns.map((key) => (
              <th key={key} className={thClass}>
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td className={tdClass}>{row.studentId}</td>
              <td className={tdClass}>{row.name}</td>
              <td className={tdClass}>{row.course}</td>
              <td className={tdClass}>{row.roomName || '—'}</td>
              <td className={tdClass}>{row.seat || '—'}</td>
              <td className={tdClass} style={{ height: '7mm' }} />
            </tr>
          ))}
        </tbody>
      </table>
      <SignatureRows />
    </section>
  )
}

function SlipsPage({ cards, institution, exam }) {
  const { t, n, d, time } = useLang()
  return (
    <section className="print-page">
      <div className="slip-page">
        {cards.map((card) => (
          <div
            key={card.studentId}
            className="avoid-break border-2 border-black p-1.5 text-[9px] leading-tight"
          >
            <p className="truncate text-[10px] font-bold">
              {institution.name || t('app.untitled')}
            </p>
            <p className="truncate font-semibold">
              {exam.title || t('app.untitled')}
            </p>
            <p>
              {d(exam.date) || '—'} · {time(exam.startTime)}–{time(exam.endTime)}
            </p>
            <div className="mt-1 border-t border-black pt-1">
              <p className="font-bold">{card.name}</p>
              <p>{card.studentId}</p>
              <p>{card.course}</p>
            </div>
            <p className="mt-1 border-t border-black pt-0.5 font-semibold">
              {t('print.room')}: {card.roomName || t('app.untitled')} · {t('plan.seat')}: {n(card.seat)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PrintPage() {
  const { t } = useLang()
  const { institution, rooms, examStudents, exam, plan } = useData()
  const [doc, setDoc] = useState('grid')
  const [roomId, setRoomId] = useState('')

  const courses = useCourses(examStudents)
  const byId = useMemo(() => studentIndex(examStudents), [examStudents])
  const view = useMemo(
    () =>
      buildPrintView({ plan, rooms, students: examStudents, exam, institution }),
    [plan, rooms, examStudents, exam, institution],
  )
  const ready = Boolean(view)

  const printedRooms = useMemo(
    () => (view ? view.rooms.filter((room) => !roomId || room.roomId === roomId) : []),
    [view, roomId],
  )
  const doorPages = useMemo(() => {
    if (!view) return []
    return printedRooms.map((room) => ({
      key: room.roomId,
      roomName: room.name,
      rows: doorSheetRows(view, byId, room.roomId),
    }))
  }, [view, printedRooms, byId])
  const attendancePages = useMemo(
    () => (view ? chunk(attendanceRows(view, byId, [...byId.keys()]), 25) : []),
    [view, byId],
  )
  const slipPages = useMemo(
    () => (view ? chunk(admitCards(view, byId), SLIPS_PER_PAGE) : []),
    [view, byId],
  )

  function handleExportCsv() {
    if (!view) return
    downloadCsv(
      planCsvFilename(exam),
      planCsv({
        exam,
        institution,
        result: view,
        byId,
        header: PLAN_CSV_LABEL_KEYS.map((key) => t(key)),
        status: { seated: t('csv.seated'), unseated: t('csv.unseated') },
      }),
    )
  }

  // Both buttons open the browser print dialog, which offers "Save as PDF".
  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <div className="print:hidden">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">{t('print.title')}</h2>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {t('print.document')}
              </span>
              <select
                className={inputClass}
                value={doc}
                onChange={(event) => setDoc(event.target.value)}
              >
                {DOCS.map((id) => (
                  <option key={id} value={id}>
                    {t('print.doc.' + id)}
                  </option>
                ))}
              </select>
            </label>

            {(doc === 'grid' || doc === 'door') && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  {t('print.room')}
                </span>
                <select
                  className={inputClass}
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                >
                  <option value="">{t('print.allRooms')}</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className={primaryClass}
              disabled={!ready}
              onClick={handlePrint}
            >
              {t('print.print')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!ready}
              onClick={handlePrint}
            >
              {t('print.savePdf')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!ready}
              onClick={handleExportCsv}
            >
              {t('print.exportCsv')}
            </button>
          </div>

          {!ready && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t('print.noPlan')}
            </p>
          )}
          {ready && (
            <p className="mt-3 text-xs text-slate-500">{t('print.pdfHint')}</p>
          )}
          {doc === 'slips' && (
            <p className="mt-1 text-xs text-slate-500">{t('print.slipsHint')}</p>
          )}
        </section>
      </div>

      <div className="print-root">
        {ready &&
          doc === 'grid' &&
          printedRooms.map((room) => (
            <GridPage
              key={room.roomId}
              room={room}
              institution={institution}
              exam={exam}
              courses={courses}
            />
          ))}
        {ready &&
          doc === 'door' &&
          doorPages.map((page) => (
            <DoorPage
              key={page.key}
              rows={page.rows}
              roomName={page.roomName}
              institution={institution}
              exam={exam}
            />
          ))}
        {ready &&
          doc === 'attendance' &&
          attendancePages.map((page, index) => (
            <AttendancePage
              key={index}
              rows={page}
              institution={institution}
              exam={exam}
            />
          ))}
        {ready &&
          doc === 'slips' &&
          slipPages.map((page, index) => (
            <SlipsPage
              key={index}
              cards={page}
              institution={institution}
              exam={exam}
            />
          ))}
      </div>
    </div>
  )
}