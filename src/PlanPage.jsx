import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import {
  CONSTRAINTS,
  DEFAULT_OPTIONS,
  generatePlan,
  hydratePlan,
  normalizeOptions,
} from './seating.js'
import { conflictingRoomIds } from './exams.js'
import {
  canRedo,
  canUndo,
  captureLocked,
  commit,
  createHistory,
  isLocked,
  moveStudent,
  pinLockedSeats,
  redo,
  removeStudent,
  seatKey,
  snapshot,
  toggleIn,
  toggleLock,
  undo,
} from './edits.js'

const COURSE_COLORS = [
  'border-indigo-300 bg-indigo-100 text-indigo-900',
  'border-emerald-300 bg-emerald-100 text-emerald-900',
  'border-amber-300 bg-amber-100 text-amber-900',
  'border-rose-300 bg-rose-100 text-rose-900',
  'border-sky-300 bg-sky-100 text-sky-900',
  'border-violet-300 bg-violet-100 text-violet-900',
]

const RULE_KEYS = {
  [CONSTRAINTS.courseSide]: 'plan.rule.courseSide',
  [CONSTRAINTS.courseFrontBack]: 'plan.rule.courseFrontBack',
  [CONSTRAINTS.department]: 'plan.rule.department',
}

const TOGGLES = [
  { key: 'noSameCourseSideBySide', label: 'plan.opt.sideBySide' },
  { key: 'noSameCourseFrontBack', label: 'plan.opt.frontBack' },
  { key: 'noSameDepartment', label: 'plan.opt.department' },
  { key: 'skipAlternateBenches', label: 'plan.opt.skipBenches' },
  { key: 'skipAlternateColumns', label: 'plan.opt.skipColumns' },
]

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function PlanPage() {
  const { t, n } = useLang()
  const {
    rooms,
    examStudents,
    exams,
    plans,
    activeExamId,
    exam,
    plan,
    seating,
    setPlan,
    updateSeating,
  } = useData()

  const [editMode, setEditMode] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)
  const [dragKey, setDragKey] = useState(null)
  const [history, setHistory] = useState(() =>
    createHistory(
      snapshot({
        plan,
        lockedSeats: seating.lockedSeats,
        absentIds: seating.absentIds,
        specialNeedsIds: seating.specialNeedsIds,
      }),
    ),
  )

  const [options, setOptions] = useState(() => normalizeOptions(DEFAULT_OPTIONS))
  const [result, setResult] = useState(() =>
    plan ? hydratePlan(plan, rooms, examStudents, DEFAULT_OPTIONS) : null,
  )
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Rooms already taken by another exam whose slot overlaps: never offered.
  const blockedRoomIds = useMemo(
    () => conflictingRoomIds({ exams, plans, activeExamId }),
    [exams, plans, activeExamId],
  )
  const usableRooms = useMemo(
    () => rooms.filter((room) => !blockedRoomIds.has(room.id)),
    [rooms, blockedRoomIds],
  )

  // Keep the grids in step with whatever plan is stored (reload, import, reset).
  useEffect(() => {
    if (plan) {
      setResult(hydratePlan(plan, usableRooms, examStudents, optionsRef.current))
    }
  }, [plan, usableRooms, examStudents])

  const courses = useMemo(() => {
    const list = Array.from(
      new Set(examStudents.map((student) => student.course).filter(Boolean)),
    ).sort()
    return {
      list,
      map: new Map(
        list.map((course, index) => [
          course,
          COURSE_COLORS[index % COURSE_COLORS.length],
        ]),
      ),
    }
  }, [examStudents])

  const studentById = useMemo(() => {
    const map = new Map()
    for (const student of examStudents) map.set(String(student.id), student)
    return map
  }, [examStudents])

  function currentSnapshot() {
    return snapshot({
      plan,
      lockedSeats: seating.lockedSeats,
      absentIds: seating.absentIds,
      specialNeedsIds: seating.specialNeedsIds,
    })
  }

  function applySnapshot(value) {
    if (value.plan) setPlan(value.plan)
    updateSeating({
      lockedSeats: value.lockedSeats,
      absentIds: value.absentIds,
      specialNeedsIds: value.specialNeedsIds,
    })
  }

  function applyEdit(next) {
    setHistory((current) => commit(current, next))
    applySnapshot(next)
  }

  function handleUndo() {
    const next = undo(history)
    if (next === history) return
    setHistory(next)
    applySnapshot(next.present)
  }

  function handleRedo() {
    const next = redo(history)
    if (next === history) return
    setHistory(next)
    applySnapshot(next.present)
  }

  function studentIdAt(key) {
    if (!plan) return null
    const item = plan.assignments.find((a) => seatKey(a) === key)
    return item ? String(item.studentId) : null
  }

  function seatAt(key) {
    const [roomId, position] = String(key).split(':')
    const [row, col] = position.split(',').map(Number)
    const room = rooms.find((item) => item.id === roomId)
    return { roomId, roomName: room ? room.name : roomId, row, col }
  }

  function keyFor(room, cell) {
    return seatKey({ roomId: room.roomId, row: cell.row, col: cell.col })
  }

  function swapTo(targetKey) {
    if (!plan || !selectedKey || selectedKey === targetKey) return false
    const nextPlan = moveStudent(plan, seatAt(selectedKey), seatAt(targetKey))
    applyEdit(snapshot({ ...currentSnapshot(), plan: nextPlan }))
    setSelectedKey(null)
    return true
  }

  function handleSeatClick(room, cell) {
    if (!editMode || cell.blocked) return
    const key = keyFor(room, cell)
    if (selectedKey === key) {
      setSelectedKey(null)
      return
    }
    if (!selectedKey) {
      if (cell.studentId) setSelectedKey(key)
      return
    }
    swapTo(key)
  }

  function handleDrop(room, cell) {
    if (!editMode || !dragKey || cell.blocked) return
    const target = keyFor(room, cell)
    if (dragKey === target) {
      setDragKey(null)
      return
    }
    const pinnedKey = dragKey
    setDragKey(null)
    if (!plan) return
    applyEdit(
      snapshot({
        ...currentSnapshot(),
        plan: moveStudent(plan, seatAt(pinnedKey), seatAt(target)),
      }),
    )
  }

  function toggleSeatLock(key) {
    applyEdit(
      snapshot({
        ...currentSnapshot(),
        lockedSeats: toggleLock(seating.lockedSeats, key),
      }),
    )
  }

  // Marking someone absent frees their seat straight away, so the grid and the
  // flags never disagree.
  function toggleAbsent(studentId) {
    const id = String(studentId)
    const wasAbsent = seating.absentIds.map(String).includes(id)
    applyEdit(
      snapshot({
        ...currentSnapshot(),
        plan: wasAbsent ? plan : removeStudent(plan, id),
        absentIds: toggleIn(seating.absentIds, id),
      }),
    )
  }

  function toggleSpecial(studentId) {
    applyEdit(
      snapshot({
        ...currentSnapshot(),
        specialNeedsIds: toggleIn(seating.specialNeedsIds, String(studentId)),
      }),
    )
  }

  // Regenerating honours the flags: absent students stay out and locked seats
  // keep whoever is sitting in them.
  function run(next) {
    const opts = normalizeOptions({
      ...next,
      excludeStudentIds: seating.absentIds,
      frontSeatStudentIds: seating.specialNeedsIds,
    })
    const pinned = captureLocked(plan, seating.lockedSeats)
    const generated = generatePlan({
      rooms: usableRooms,
      students: examStudents,
      examId: exam ? exam.id : '',
      options: opts,
    })
    const merged = { ...generated, plan: pinLockedSeats(generated.plan, pinned) }
    setOptions(opts)
    setResult(merged)
    setPlan(merged.plan)
    setSelectedKey(null)
    setDragKey(null)
    setHistory(
      createHistory(
        snapshot({
          plan: merged.plan,
          lockedSeats: seating.lockedSeats,
          absentIds: seating.absentIds,
          specialNeedsIds: seating.specialNeedsIds,
        }),
      ),
    )
  }

  const selectedStudentId = selectedKey ? studentIdAt(selectedKey) : null
  const selectedAbsent = selectedStudentId
    ? seating.absentIds.map(String).includes(selectedStudentId)
    : false
  const selectedSpecial = selectedStudentId
    ? seating.specialNeedsIds.map(String).includes(selectedStudentId)
    : false
  const selectedLocked = selectedKey
    ? isLocked(seating.lockedSeats, selectedKey)
    : false

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold sm:text-lg">{t('plan.options')}</h2>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TOGGLES.map((item) => (
            <label key={item.key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={options[item.key]}
                onChange={() =>
                  setOptions((current) => ({
                    ...current,
                    [item.key]: !current[item.key],
                  }))
                }
              />
              <span>
                {t(item.label)}
                {item.key === 'noSameDepartment' && (
                  <span className="block text-xs text-slate-500">
                    {t('plan.opt.departmentNote')}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {t('plan.order')}
            </span>
            <select
              className={inputClass}
              value={options.order}
              onChange={(event) =>
                setOptions((current) => ({ ...current, order: event.target.value }))
              }
            >
              <option value="roll">{t('plan.order.roll')}</option>
              <option value="shuffle">{t('plan.order.shuffle')}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {t('plan.seed')}
            </span>
            <input
              type="number"
              min="1"
              max="999999"
              className={inputClass}
              value={options.seed}
              onChange={(event) =>
                setOptions((current) => ({ ...current, seed: event.target.value }))
              }
            />
          </label>

          <button type="button" className={primaryClass} onClick={() => run(options)}>
            {t('plan.generate')}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              run({ ...options, seed: (Number(options.seed) || 0) + 1 })
            }
          >
            {t('plan.regenerate')}
          </button>
        </div>
      </section>

      {blockedRoomIds.size > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('plan.blockedRooms')}:{' '}
          {rooms
            .filter((room) => blockedRoomIds.has(room.id))
            .map((room) => room.name)
            .join(', ')}
        </p>
      )}

      {result ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {t('plan.score')}
              </div>
              <div
                className={
                  'text-3xl font-semibold ' +
                  (result.score.score === 100 ? 'text-emerald-600' : 'text-amber-600')
                }
              >
                {n(result.score.score)}%
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <div>
                {t('plan.score.satisfied')}: {n(result.score.satisfied)} /{' '}
                {n(result.score.checks)}
              </div>
              <div>
                {t('plan.attempts')}: {n(result.score.attempts)}
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <div>
                {t('plan.seated')}: {n(result.totals.seated)} / {n(result.totals.capacity)}
              </div>
              <div>
                {t('plan.unseated')}: {n(result.totals.unseated)}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
          {t('plan.needsPlan')}
        </p>
      )}

      {result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={editMode ? primaryClass : buttonClass}
              onClick={() => {
                setEditMode((value) => !value)
                setSelectedKey(null)
              }}
            >
              {t('edit.title')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!canUndo(history)}
              onClick={handleUndo}
            >
              ↶ {t('edit.undo')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!canRedo(history)}
              onClick={handleRedo}
            >
              ↷ {t('edit.redo')}
            </button>
            <span className="text-xs text-slate-500">
              {t('edit.locked')}: {n(seating.lockedSeats.length)} ·{' '}
              {t('edit.absentCount')}: {n(seating.absentIds.length)} ·{' '}
              {t('edit.specialCount')}: {n(seating.specialNeedsIds.length)}
            </span>
          </div>

          {editMode && (
            <div className="mt-3 space-y-2 text-xs">
              <p className="text-slate-600">{t('edit.hint')}</p>
              <p className="text-slate-500">{t('edit.lockedNote')}</p>

              {selectedKey && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2">
                  <p className="font-medium text-indigo-900">
                    {t('edit.selected')}: {n(selectedKey)}
                  </p>
                  {selectedStudentId && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => toggleSeatLock(selectedKey)}
                      >
                        {selectedLocked ? t('edit.unlock') : t('edit.lock')}
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => toggleAbsent(selectedStudentId)}
                      >
                        {selectedAbsent ? t('edit.present') : t('edit.absent')}
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => toggleSpecial(selectedStudentId)}
                      >
                        {selectedSpecial ? t('edit.normal') : t('edit.special')}
                      </button>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => setSelectedKey(null)}
                      >
                        {t('edit.clearSelection')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {result && courses.list.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="mr-1 text-xs font-medium text-slate-500">
            {t('plan.legend')}
          </span>
          {courses.list.map((course) => (
            <span
              key={course}
              className={
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ' +
                courses.map.get(course)
              }
            >
              {course}
            </span>
          ))}
        </div>
      )}

      {result &&
        result.rooms.map((room) => (
          <section
            key={room.roomId}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{room.name}</h3>
              <span className="text-xs text-slate-600">
                {t('plan.seated')} {n(room.seated)} / {t('plan.capacity')}{' '}
                {n(room.capacity)} · {t('plan.utilization')} {n(room.utilization)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${room.utilization}%` }}
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              <div
                role="grid"
                aria-label={room.name}
                aria-rowcount={room.cells.length}
                aria-colcount={room.cells[0]?.length ?? 0}
                className="inline-flex flex-col gap-1.5"
              >
                {room.cells.map((line) => (
                  <div key={line[0].row} role="row" className="flex gap-1.5">
                    {line.map((cell) => {
                      const base =
                        'grid h-14 w-14 shrink-0 place-items-center rounded-md border'
                      if (cell.blockedBy === 'broken') {
                        return (
                          <span
                            key={cell.col}
                            role="gridcell"
                            aria-label={`${t('plan.cell.broken')} ${n(cell.row)},${n(cell.col)}`}
                            className={`${base} border-slate-300 bg-slate-200 text-slate-500`}
                            title={t('plan.cell.broken')}
                          >
                            <span aria-hidden="true">✕</span>
                          </span>
                        )
                      }
                      if (cell.blocked) {
                        return (
                          <span
                            key={cell.col}
                            role="gridcell"
                            aria-label={`${t('plan.cell.skipped')} ${n(cell.row)},${n(cell.col)}`}
                            className={`${base} border-dashed border-slate-300 bg-slate-50 text-slate-400`}
                            title={t('plan.cell.skipped')}
                          >
                            <span aria-hidden="true">–</span>
                          </span>
                        )
                      }
                      if (!cell.student) {
                        return (
                          <span
                            key={cell.col}
                            role="gridcell"
                            aria-label={`${n(cell.row)},${n(cell.col)} ${t('plan.cell.free')}`}
                            className={`${base} border-slate-200 bg-white text-xs text-slate-400`}
                            title={t('plan.cell.free')}
                          >
                            {n(cell.row)},{n(cell.col)}
                          </span>
                        )
                      }
                      const color =
                        courses.map.get(cell.student.course) ||
                        'border-slate-300 bg-slate-50 text-slate-800'
                      const key = keyFor(room, cell)
                      const locked = isLocked(seating.lockedSeats, key)
                      const id = String(cell.student.id)
                      const absent = seating.absentIds.map(String).includes(id)
                      const special = seating.specialNeedsIds
                        .map(String)
                        .includes(id)
                      const label = `${cell.student.name} (${cell.student.id}) · ${t('plan.seat')} ${n(cell.row)},${n(cell.col)}`
                      const body = (
                        <>
                          <span className={absent ? 'line-through' : ''}>
                            {cell.student.name}
                          </span>
                          {(locked || absent || special) && (
                            <span className="mt-0.5 block text-[9px] leading-none">
                              {locked && <span title={t('edit.locked')}>🔒</span>}
                              {absent && <span title={t('edit.absent')}>✕</span>}
                              {special && <span title={t('edit.special')}>★</span>}
                            </span>
                          )}
                        </>
                      )
                      const ring =
                        selectedKey === key ? ' ring-2 ring-indigo-500' : ''

                      if (!editMode) {
                        return (
                          <span
                            key={cell.col}
                            role="gridcell"
                            aria-label={label}
                            className={`${base} px-1 text-center text-[10px] leading-tight ${color}${ring}`}
                            title={label}
                          >
                            {body}
                          </span>
                        )
                      }
                      return (
                        <button
                          key={cell.col}
                          type="button"
                          role="gridcell"
                          aria-label={label}
                          draggable
                          title={label}
                          onDragStart={() => setDragKey(key)}
                          onDragEnd={() => setDragKey(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDrop(room, cell)}
                          onClick={() => handleSeatClick(room, cell)}
                          className={`${base} cursor-grab px-1 text-center text-[10px] leading-tight ${color}${ring}`}
                        >
                          {body}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

      {result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-sm font-semibold">
            {t('plan.violations')} ({n(result.violations.length)})
          </h3>
          {result.violations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">{t('plan.noViolations')}</p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-xs">
              {result.violations.map((item, index) => (
                <li
                  key={`${item.roomId}-${item.row}-${item.col}-${item.studentId}-${index}`}
                  className="rounded-md bg-red-50 px-2 py-1 text-red-800"
                >
                  <span className="font-medium">{item.roomName}</span> ·{' '}
                  {t('plan.seat')} {n(item.row)},{n(item.col)} ·{' '}
                  {t(RULE_KEYS[item.constraint])}{' '}
                  ({t('plan.direction.' + item.direction)}) · {item.studentName}{' '}
                  {t('plan.arrow')} {item.withStudentName}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-4 text-sm font-semibold">
            {t('plan.unseated')} ({n(result.totals.unseated)})
          </h3>
          {result.totals.unseated === 0 ? null : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {result.plan.unseated.map((id) => {
                const student = studentById.get(id)
                return (
                  <li
                    key={id}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900"
                  >
                    {student ? `${student.name} (${student.id})` : id}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}