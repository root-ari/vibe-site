import { useMemo, useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import {
  benchOf,
  buildResults,
  scopeStudents,
  searchStudents,
  seatMap,
} from './search.js'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const primaryClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

function SeatMap({ room, plan, assignment }) {
  const { t, n } = useLang()
  const grid = seatMap({ room, plan, assignment })
  if (!grid) return null

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{t('plan.seat')}</p>
      <div
        role="grid"
        aria-label={t('plan.seat')}
        className="inline-flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2"
      >
        {grid.cells.map((line) => (
          <div key={line[0].row} role="row" className="flex gap-1">
            {line.map((cell) => (
              <div
                key={cell.col}
                role="gridcell"
                // Row/column read out so the map is usable without sight of the grid.
                aria-label={`${n(cell.row)},${n(cell.col)}`}
                aria-current={cell.here ? 'true' : undefined}
                title={`${n(cell.row)},${n(cell.col)}`}
                className={
                  'grid h-6 w-6 place-items-center rounded text-[9px] ' +
                  (cell.here
                    ? 'bg-indigo-600 font-bold text-white'
                    : cell.blockedBy === 'broken'
                      ? 'bg-slate-300 text-slate-600'
                      : cell.blocked
                        ? 'bg-slate-100 text-slate-400'
                        : 'border border-slate-200 bg-white text-slate-300')
                }
              >
                {cell.here ? '★' : cell.blockedBy === 'broken' ? '✕' : cell.blocked ? '–' : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Printed only, never on screen.
function Slip({ card, student, institution }) {
  const { t, n, d, time } = useLang()
  const assignment = card.assignment
  const room = card.room

  return (
    <div className="avoid-break mb-4 border-2 border-black p-4 text-xs leading-tight">
      <p className="text-[10px] font-bold">{institution.name || t('app.untitled')}</p>
      <p className="text-sm font-semibold">{card.exam.title || t('app.untitled')}</p>
      <p>
        {d(card.exam.date) || '—'} · {time(card.exam.startTime)}–
        {time(card.exam.endTime)}
      </p>

      <div className="mt-2 border-t border-black pt-2">
        <p className="text-base font-bold">{student.name}</p>
        <p>
          {t('search.id')}: {student.id}
        </p>
        <p>
          {t('csv.course')}: {student.course}
        </p>
      </div>

      <div className="mt-2 border-t border-black pt-1">
        {assignment ? (
          <p className="font-semibold">
            {t('print.room')}: {room ? room.name : assignment.roomName}
            {room && room.building ? ` (${t('search.building')}: ${room.building})` : ''} ·{' '}
            {t('plan.seat')}: {n(assignment.row)},{n(assignment.col)}
            {/* benchOf needs a real room, which is missing after a room is deleted */}
            {room ? ` · ${t('search.bench')} ${n(benchOf(room, assignment.col))}` : ''}
          </p>
        ) : (
          <p className="font-semibold">{t('search.unseated')}</p>
        )}
      </div>

      <div className="mt-4 flex gap-8">
        <div className="flex-1 border-t border-black pt-1">{t('print.invigilator')}</div>
        <div className="flex-1 border-t border-black pt-1">{t('print.signature')}</div>
      </div>
    </div>
  )
}

function useSearch({ students, exams, activeExamId, plans, rooms, query, scope, chosen }) {
  const pool = useMemo(
    () => scopeStudents({ exams, students, scope, activeExamId }),
    [exams, students, scope, activeExamId],
  )
  const matches = useMemo(() => searchStudents(pool, query), [pool, query])
  const visibleExams = useMemo(
    () => (scope === 'all' ? exams : exams.filter((exam) => exam.id === activeExamId)),
    [exams, scope, activeExamId],
  )
  const student = useMemo(() => {
    if (matches.length === 0) return null
    const picked = matches.find((item) => String(item.id) === String(chosen))
    return picked || (matches.length === 1 ? matches[0] : null)
  }, [matches, chosen])
  const cards = useMemo(
    () =>
      student
        ? buildResults({ studentId: student.id, exams: visibleExams, plans, rooms })
        : [],
    [student, visibleExams, plans, rooms],
  )
  return { matches, student, cards }
}

export default function SearchPage() {
  const { t, n, d, time } = useLang()
  const { students, exams, activeExamId, plans, rooms, institution } = useData()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('current')
  const [chosen, setChosen] = useState('')

  const { matches, student, cards } = useSearch({
    students,
    exams,
    activeExamId,
    plans,
    rooms,
    query,
    scope,
    chosen,
  })

  const typed = query.trim().length > 0

  return (
    <div>
      <div className="print:hidden space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">{t('search.title')}</h2>

          <input
            type="search"
            autoComplete="off"
            className={`${inputClass} mt-4 text-lg sm:text-xl`}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setChosen('')
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {t('search.scope')}
              </span>
              <select
                className={selectClass}
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value)
                  setChosen('')
                }}
              >
                <option value="current">{t('search.scope.current')}</option>
                <option value="all">{t('search.scope.all')}</option>
              </select>
            </label>
            {matches.length > 0 && (
              <p className="text-sm text-slate-600">
                {n(matches.length)} {t('search.found')}
              </p>
            )}
          </div>

          {matches.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setChosen(String(item.id))}
                    className={
                      'rounded-lg border px-2 py-1 text-xs transition ' +
                      (student && String(student.id) === String(item.id)
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
                    }
                  >
                    {item.name} · {item.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!typed && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
            {t('search.hint')}
          </p>
        )}

        {typed && matches.length === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h3 className="text-base font-semibold text-amber-700">
              {t('search.noResult')}
            </h3>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {['search.tip.id', 'search.tip.name', 'search.tip.digits', 'search.tip.spaces'].map(
                (key) => (
                  <li key={key}>• {t(key)}</li>
                ),
              )}
            </ul>
          </section>
        )}

        {student && cards.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-base font-semibold">{student.name}</p>
              <p className="text-sm text-slate-600">
                {t('search.id')}: {student.id} · {t('csv.course')}: {student.course}
              </p>
            </div>

            {cards.map((card) => (
              <section
                key={card.exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {card.exam.title || t('app.untitled')}
                    </p>
                    <p className="text-slate-600">
                      {t('print.date')}: {d(card.exam.date) || '—'} ·{' '}
                      {time(card.exam.startTime)}–{time(card.exam.endTime)}
                    </p>
                    {card.status === 'seated' ? (
                      <p className="mt-1 text-slate-700">
                        {t('print.room')}:{' '}
                        {card.room ? card.room.name : card.assignment.roomName}
                        {card.room && card.room.building
                          ? ` · ${t('search.building')}: ${card.room.building}`
                          : ''}{' '}
                        · {t('plan.seat')}: {n(card.assignment.row)},
                        {n(card.assignment.col)}
                        {/* guard: the room can be deleted while the plan keeps its seat */}
                        {card.room
                          ? ` · ${t('search.bench')} ${n(benchOf(card.room, card.assignment.col))}`
                          : ''}
                      </p>
                    ) : (
                      <p className="mt-1 font-medium text-amber-700">
                        {card.status === 'unseated'
                          ? t('search.unseated')
                          : t('search.noPlan')}
                      </p>
                    )}
                  </div>
                  {card.status === 'seated' && (
                    <SeatMap
                      room={card.room}
                      plan={card.plan}
                      assignment={card.assignment}
                    />
                  )}
                </div>
              </section>
            ))}

            <button
              type="button"
              className={primaryClass}
              onClick={() => window.print()}
            >
              🖨 {t('search.printSlip')}
            </button>
          </div>
        )}
      </div>

      <div className="print-root hidden print:block">
        {student &&
          cards.map((card) => (
            <Slip
              key={card.exam.id}
              card={card}
              student={student}
              institution={institution}
            />
          ))}
      </div>
    </div>
  )
}