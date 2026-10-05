import { useMemo, useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import {
  addMonths,
  buildMonthCalendar,
  doubleBookedRooms,
  examsByDate,
  studentClashes,
  toDateKey,
} from './exams.js'

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

// Month names come from Intl for the active language rather than a hardcoded
// string, so English shows "May 2026" and Bangla shows the Bangla month.
function monthLabel(year, month, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month, 1))
  } catch {
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }
}

function todayKey() {
  const now = new Date()
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

function cursorForDate(date) {
  if (!date) return null
  const [year, month] = String(date).split('-').map(Number)
  if (!year || !month) return null
  return { year, month: month - 1 }
}

export default function ExamsPage() {
  const { t, lang, n, d, time } = useLang()
  const {
    exams,
    activeExamId,
    exam,
    students,
    rooms,
    plans,
    setActiveExam,
    addExam,
    duplicateExam,
    deleteExam,
  } = useData()

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const weeks = useMemo(
    () => buildMonthCalendar(cursor.year, cursor.month),
    [cursor],
  )
  const byDate = useMemo(() => examsByDate(exams), [exams])
  const weekdays = t('exams.weekdays').split(' ')
  const today = todayKey()
  const roomClashes = useMemo(() => doubleBookedRooms({ exams, plans }), [exams, plans])
  const clashes = useMemo(() => studentClashes({ exams }), [exams])
  const studentById = useMemo(
    () => new Map(students.map((student) => [String(student.id), student])),
    [students],
  )
  const roomNames = useMemo(
    () => new Map(rooms.map((room) => [room.id, room.name])),
    [rooms],
  )
  // Exams involved in any room or student clash, for the calendar markers.
  const conflictExamIds = useMemo(() => {
    const ids = new Set()
    for (const clash of roomClashes) {
      for (const item of clash.exams) ids.add(item.id)
    }
    for (const clash of clashes) {
      for (const item of clash.exams) ids.add(item.id)
    }
    return ids
  }, [roomClashes, clashes])

  function selectExam(id) {
    setActiveExam(id)
    setConfirmingDelete(false)
    const next = exams.find((item) => item.id === id)
    const target = cursorForDate(next && next.date)
    if (target) setCursor(target)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold sm:text-lg">{t('exams.title')}</h2>

        {exams.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t('exams.none')}</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {t('exams.selector')}
              </span>
              <select
                className={inputClass}
                value={activeExamId}
                onChange={(event) => selectExam(event.target.value)}
              >
                {exams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || t('app.untitled')}
                    {item.date ? ` · ${d(item.date)}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={primaryClass}
              onClick={() => addExam({ title: t('exams.add') })}
            >
              + {t('exams.add')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!exam}
              onClick={() => duplicateExam(activeExamId)}
            >
              {t('exams.duplicate')}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setConfirmingDelete(true)}
            >
              {t('exams.delete')}
            </button>
          </div>
        )}

        {confirmingDelete && exam && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              {t('exams.deleteConfirm')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  deleteExam(activeExamId)
                  setConfirmingDelete(false)
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t('exams.deleteYes')}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => setConfirmingDelete(false)}
              >
                {t('exams.deleteNo')}
              </button>
            </div>
          </div>
        )}

        {exam && (
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <div>
              <dt className="inline font-medium">{t('exams.slot')}: </dt>
              <dd className="inline">
                {d(exam.date) || t('exams.noDate')} ·{' '}
                {time(exam.startTime)}–{time(exam.endTime)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">{t('exams.roster')}: </dt>
              <dd className="inline">{n(exam.studentIds.length)}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold">{t('exams.roomConflicts')}</h3>
        {roomClashes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t('exams.noRoomConflicts')}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {roomClashes.map((clash) => (
              <li
                key={clash.roomId}
                className="rounded-md bg-red-50 px-2 py-1 text-red-800"
              >
                <span className="font-medium">
                  {roomNames.get(clash.roomId) || clash.roomId}
                </span>{' '}
                —{' '}
                {clash.overlapping
                  .map(
                    (pair) =>
                      `${pair.first.title} ${t('exams.clashesWith')} ${pair.second.title}`,
                  )
                  .join(', ')}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-sm font-semibold">
          {t('exams.studentConflicts')} ({n(clashes.length)})
        </h3>
        {clashes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            {t('exams.noStudentConflicts')}
          </p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
            {clashes.slice(0, 10).map((clash) => {
              const student = studentById.get(clash.studentId)
              return (
                <li
                  key={clash.studentId}
                  className="rounded-md bg-amber-50 px-2 py-1 text-amber-900"
                >
                  {student ? `${student.name} (${student.id})` : clash.studentId} —{' '}
                  {clash.exams.map((item) => item.title).join(', ')}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('exams.calendar')}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={buttonClass}
              aria-label={t('exams.prevMonth')}
              onClick={() =>
                setCursor(addMonths(cursor.year, cursor.month, -1))
              }
            >
              ‹
            </button>
            <span className="min-w-32 text-center text-sm font-medium">
              {monthLabel(cursor.year, cursor.month, lang)}
            </span>
            <button
              type="button"
              className={buttonClass}
              aria-label={t('exams.nextMonth')}
              onClick={() => setCursor(addMonths(cursor.year, cursor.month, 1))}
            >
              ›
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                const now = new Date()
                setCursor({ year: now.getFullYear(), month: now.getMonth() })
              }}
            >
              {t('exams.today')}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
          {weekdays.map((day, index) => (
            <div key={index}>{day}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {weeks.flat().map((cell) => {
            const dayExams = byDate.get(cell.date) || []
            const isToday = cell.date === today
            return (
              <div
                key={cell.date}
                className={
                  'min-h-16 rounded-md border p-1 text-xs ' +
                  (cell.inMonth
                    ? 'border-slate-200 bg-white'
                    : 'border-transparent bg-slate-50 text-slate-400') +
                  (isToday ? ' ring-2 ring-indigo-400' : '')
                }
              >
                <div className="text-right font-medium">
                  {n(Number(cell.date.slice(-2)))}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {dayExams.map((item) => {
                    const active = item.id === activeExamId
                    const flagged = conflictExamIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectExam(item.id)}
                        title={`${item.title} · ${item.startTime}-${item.endTime}`}
                        className={
                          'block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ' +
                          (active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100')
                        }
                      >
                        {item.title || t('app.untitled')}
                        {flagged && (
                          <span
                            className={
                              'ml-1 font-bold ' +
                              (active ? 'text-white' : 'text-red-600')
                            }
                            title={t('exams.clashesWith')}
                          >
                            !
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}