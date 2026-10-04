/**
 * Pure helpers for manual seat-plan editing: swapping students between seats,
 * locking seats, marking students absent or special-needs, and a small
 * undo/redo history. Every function returns new objects - nothing is mutated.
 */

export const HISTORY_LIMIT = 50

export function seatKey(seat) {
  if (!seat) return ''
  return `${seat.roomId}:${seat.row},${seat.col}`
}

function findIndex(plan, seat) {
  const key = seatKey(seat)
  return plan.assignments.findIndex((item) => seatKey(item) === key)
}

// Swap two seated students, or move one student into an empty seat.
export function moveStudent(plan, from, to) {
  if (!plan || !from || !to) return plan
  const fromKey = seatKey(from)
  const toKey = seatKey(to)
  if (fromKey === toKey) return plan

  const fromIndex = findIndex(plan, from)
  if (fromIndex < 0) return plan
  const toIndex = findIndex(plan, to)
  const assignments = plan.assignments.slice()

  if (toIndex < 0) {
    assignments[fromIndex] = {
      ...assignments[fromIndex],
      roomId: to.roomId,
      roomName: to.roomName,
      row: to.row,
      col: to.col,
    }
  } else {
    const a = assignments[fromIndex]
    const b = assignments[toIndex]
    assignments[fromIndex] = {
      ...a,
      roomId: b.roomId,
      roomName: b.roomName,
      row: b.row,
      col: b.col,
    }
    assignments[toIndex] = {
      ...b,
      roomId: a.roomId,
      roomName: a.roomName,
      row: a.row,
      col: a.col,
    }
  }
  return { ...plan, assignments }
}

// Take a student out of the plan entirely (used when they are marked absent).
// They are not reported as unseated: absent is not the same as no seat.
export function removeStudent(plan, studentId) {
  if (!plan) return plan
  const id = String(studentId)
  if (!plan.assignments.some((item) => String(item.studentId) === id)) return plan
  return { ...plan, assignments: plan.assignments.filter((item) => String(item.studentId) !== id) }
}

export function toggleIn(list, value) {
  const items = (list || []).map(String)
  const key = String(value)
  return items.includes(key) ? items.filter((item) => item !== key) : [...items, key]
}

export function toggleLock(lockedSeats, key) {
  return toggleIn(lockedSeats, key)
}

export function isLocked(lockedSeats, key) {
  return (lockedSeats || []).map(String).includes(String(key))
}

/* ------------------------- locked seats -------------------------- */

// Who is sitting in a locked seat right now - captured before regenerating.
export function captureLocked(plan, lockedSeats) {
  if (!plan) return []
  const locked = new Set((lockedSeats || []).map(String))
  return plan.assignments
    .filter((item) => locked.has(seatKey(item)))
    .map((item) => ({
      studentId: String(item.studentId),
      roomId: item.roomId,
      roomName: item.roomName,
      row: item.row,
      col: item.col,
    }))
}

// Put the pinned students back into exactly the seats they held, and let the
// student a pinned seat displaces fall through to the unseated list.
export function pinLockedSeats(plan, pinned) {
  if (!plan || !pinned || pinned.length === 0) return plan
  const pinnedIds = new Set(pinned.map((item) => String(item.studentId)))
  const pinnedKeys = new Set(pinned.map((item) => seatKey(item)))

  const assignments = plan.assignments.filter(
    (item) =>
      !pinnedIds.has(String(item.studentId)) && !pinnedKeys.has(seatKey(item)),
  )
  for (const item of pinned) {
    assignments.push({ ...item, studentId: String(item.studentId) })
  }

  // Anyone who had a seat before and does not have one now becomes unseated,
  // otherwise a student displaced by a pinned seat would vanish from the plan.
  const previouslySeated = plan.assignments.map((item) => String(item.studentId))
  const seatedIds = new Set(assignments.map((item) => String(item.studentId)))
  const unseated = Array.from(
    new Set([...plan.unseated.map(String), ...previouslySeated]),
  ).filter((id) => !seatedIds.has(id))

  return { ...plan, assignments, unseated }
}

/* -------------------------- edit snapshot ------------------------- */

export function snapshot({ plan, lockedSeats, absentIds, specialNeedsIds }) {
  return {
    plan,
    lockedSeats: [...(lockedSeats || [])],
    absentIds: [...(absentIds || [])],
    specialNeedsIds: [...(specialNeedsIds || [])],
  }
}

/* ----------------------------- history ---------------------------- */

function sameSnapshot(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function createHistory(value) {
  return { past: [], present: value, future: [] }
}

// Record a new edit. Committing the same value twice is a no-op.
export function commit(history, value, limit = HISTORY_LIMIT) {
  if (sameSnapshot(history.present, value)) return history
  const past = [...history.past, history.present]
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present: value,
    future: [],
  }
}

export function undo(history) {
  if (history.past.length === 0) return history
  const past = history.past.slice()
  const previous = past.pop()
  return { past, present: previous, future: [history.present, ...history.future] }
}

export function redo(history) {
  if (history.future.length === 0) return history
  const future = history.future.slice()
  const next = future.shift()
  return { past: [...history.past, history.present], present: next, future }
}

export function canUndo(history) {
  return Boolean(history && history.past.length > 0)
}

export function canRedo(history) {
  return Boolean(history && history.future.length > 0)
}