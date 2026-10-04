import test from 'node:test'
import assert from 'node:assert/strict'

import {
  HISTORY_LIMIT,
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

const PLAN = {
  examId: 'exam-1',
  assignments: [
    { studentId: 'S1', roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
    { studentId: 'S2', roomId: 'r1', roomName: 'A-101', row: 1, col: 2 },
    { studentId: 'S3', roomId: 'r2', roomName: 'A-102', row: 2, col: 1 },
  ],
  unseated: ['S4'],
  seed: 1,
  constraintsUsed: ['course-side'],
}

const at = (plan, studentId) => plan.assignments.find((a) => a.studentId === studentId)

test('seatKey identifies a seat by room and 1-based position', () => {
  assert.equal(seatKey({ roomId: 'r1', row: 2, col: 3 }), 'r1:2,3')
  assert.equal(seatKey(null), '')
})

test('moving between two occupied seats swaps the students', () => {
  const next = moveStudent(
    PLAN,
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 2 },
  )
  assert.equal(at(next, 'S1').col, 2)
  assert.equal(at(next, 'S2').col, 1)
  assert.equal(next.assignments.length, 3)
  // the original plan is untouched
  assert.equal(at(PLAN, 'S1').col, 1)
})

test('moving into an empty seat relocates the student', () => {
  const next = moveStudent(
    PLAN,
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
    { roomId: 'r2', roomName: 'A-102', row: 3, col: 2 },
  )
  assert.equal(at(next, 'S1').roomId, 'r2')
  assert.equal(at(next, 'S1').roomName, 'A-102')
  assert.equal(at(next, 'S1').row, 3)
  assert.equal(at(next, 'S1').col, 2)
  assert.equal(next.assignments.length, 3)
})

test('moving to the same seat or from an empty one changes nothing', () => {
  const same = moveStudent(
    PLAN,
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
  )
  assert.deepEqual(same, PLAN)

  const nowhere = moveStudent(
    PLAN,
    { roomId: 'r9', roomName: 'Ghost', row: 1, col: 1 },
    { roomId: 'r1', roomName: 'A-101', row: 1, col: 2 },
  )
  assert.deepEqual(nowhere, PLAN)
})

test('removing an absent student frees the seat but keeps them off the unseated list', () => {
  const next = removeStudent(PLAN, 'S1')
  assert.equal(next.assignments.length, 2)
  assert.equal(at(next, 'S1'), undefined)
  assert.deepEqual(next.unseated, ['S4'])
  assert.deepEqual(removeStudent(PLAN, 'nobody'), PLAN)
})

test('locks toggle and are reported per seat', () => {
  let locks = []
  locks = toggleLock(locks, 'r1:1,1')
  assert.deepEqual(locks, ['r1:1,1'])
  assert.equal(isLocked(locks, 'r1:1,1'), true)
  assert.equal(isLocked(locks, 'r1:1,2'), false)
  locks = toggleLock(locks, 'r1:1,1')
  assert.deepEqual(locks, [])
})

test('toggleIn adds then removes', () => {
  assert.deepEqual(toggleIn(['a'], 'b'), ['a', 'b'])
  assert.deepEqual(toggleIn(['a', 'b'], 'a'), ['b'])
  assert.deepEqual(toggleIn(undefined, 'a'), ['a'])
})

test('a snapshot copies the lists so later edits cannot leak in', () => {
  const locks = ['r1:1,1']
  const snap = snapshot({
    plan: PLAN,
    lockedSeats: locks,
    absentIds: ['S4'],
    specialNeedsIds: [],
  })
  locks.push('r9:9,9')
  assert.deepEqual(snap.lockedSeats, ['r1:1,1'])
})

test('undo and redo walk back and forth through plan edits', () => {
  const start = snapshot({ plan: PLAN, lockedSeats: [], absentIds: [], specialNeedsIds: [] })
  let history = createHistory(start)
  assert.equal(canUndo(history), false)
  assert.equal(canRedo(history), false)

  const moved = snapshot({
    plan: moveStudent(
      PLAN,
      { roomId: 'r1', roomName: 'A-101', row: 1, col: 1 },
      { roomId: 'r1', roomName: 'A-101', row: 1, col: 2 },
    ),
    lockedSeats: [],
    absentIds: [],
    specialNeedsIds: [],
  })
  history = commit(history, moved)
  assert.equal(canUndo(history), true)
  assert.equal(at(history.present.plan, 'S1').col, 2)

  history = undo(history)
  assert.equal(canUndo(history), false)
  assert.equal(canRedo(history), true)
  assert.equal(at(history.present.plan, 'S1').col, 1)

  history = redo(history)
  assert.equal(at(history.present.plan, 'S1').col, 2)
})

test('committing the same value twice records only one edit', () => {
  const start = snapshot({ plan: PLAN, lockedSeats: [], absentIds: [], specialNeedsIds: [] })
  let history = createHistory(start)
  history = commit(history, start)
  assert.equal(history.past.length, 0)
})

test('a new edit clears the redo stack', () => {
  const start = snapshot({ plan: PLAN, lockedSeats: [], absentIds: [], specialNeedsIds: [] })
  const second = snapshot({ plan: PLAN, lockedSeats: ['r1:1,1'], absentIds: [], specialNeedsIds: [] })
  let history = createHistory(start)
  history = commit(history, second)
  history = undo(history)
  assert.equal(canRedo(history), true)
  history = commit(history, snapshot({ plan: PLAN, lockedSeats: ['r1:1,2'], absentIds: [], specialNeedsIds: [] }))
  assert.equal(canRedo(history), false)
})

test('undo and redo stop at the ends instead of breaking', () => {
  const start = snapshot({ plan: PLAN, lockedSeats: [], absentIds: [], specialNeedsIds: [] })
  const history = createHistory(start)
  assert.deepEqual(undo(history), history)
  assert.deepEqual(redo(history), history)
})

test('history is capped at the limit', () => {
  let history = createHistory(0)
  for (let i = 1; i <= HISTORY_LIMIT + 20; i += 1) history = commit(history, i)
  assert.equal(history.past.length, HISTORY_LIMIT)
})

test('locked seats are captured and put back after a regeneration', () => {
  const pinned = captureLocked(PLAN, ['r1:1,1'])
  assert.equal(pinned.length, 1)
  assert.equal(pinned[0].studentId, 'S1')
  assert.deepEqual(captureLocked(PLAN, []), [])
  assert.deepEqual(captureLocked(null, ['r1:1,1']), [])

  // a fresh plan where S1 sat somewhere else entirely
  const regenerated = {
    ...PLAN,
    assignments: [
      { studentId: 'S9', roomId: 'r3', roomName: 'A-103', row: 1, col: 1 },
      { studentId: 'S1', roomId: 'r1', roomName: 'A-101', row: 2, col: 2 },
    ],
    unseated: [],
  }
  const next = pinLockedSeats(regenerated, pinned)
  const back = next.assignments.find((a) => a.studentId === 'S1')
  assert.equal(back.row, 1)
  assert.equal(back.col, 1)
  // nobody is left sitting twice and nobody vanishes
  const ids = next.assignments.map((a) => String(a.studentId))
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.includes('S9'), true)
})

test('pinning pushes a displaced student to the unseated list', () => {
  const pinned = captureLocked(PLAN, ['r2:2,1'])
  assert.equal(pinned[0].studentId, 'S3')
  const next = pinLockedSeats(
    { ...PLAN, assignments: [{ studentId: 'S7', roomId: 'r2', roomName: 'A-102', row: 2, col: 1 }], unseated: [] },
    pinned,
  )
  assert.equal(next.assignments.length, 1)
  assert.equal(next.assignments[0].studentId, 'S3')
  assert.deepEqual(next.unseated, ['S7'])
})

test('pinning with nothing pinned changes nothing', () => {
  assert.deepEqual(pinLockedSeats(PLAN, []), PLAN)
  assert.deepEqual(pinLockedSeats(null, [{ studentId: 'S1' }]), null)
})