import test from 'node:test'
import assert from 'node:assert/strict'

import {
  autoAssignInvigilators,
  isBusyElsewhere,
  normalizeInvigilator,
  staffingShortfalls,
  staffingSummary,
  uniqueInvigilators,
} from './invigilators.js'

const ROOMS = [
  { id: 'r1', name: 'A-101' },
  { id: 'r2', name: 'A-102' },
  { id: 'r3', name: 'A-103' },
]

const inv = (id) => ({ id, name: id })

// The central guarantee: nobody appears in two rooms.
function assertNoDoubleBooking(assignments) {
  const seen = new Map()
  for (const [roomId, list] of Object.entries(assignments)) {
    for (const id of list) {
      const where = seen.get(id)
      assert.equal(
        where,
        undefined,
        `${id} is booked in both ${where} and ${roomId}`,
      )
      seen.set(id, roomId)
    }
  }
}

test('invigilators get sensible ids and names', () => {
  assert.deepEqual(normalizeInvigilator({ id: 'i1', name: ' Asha ' }, 0), {
    id: 'i1',
    name: 'Asha',
    phone: '',
    department: '',
  })
  const blank = normalizeInvigilator({}, 2)
  assert.equal(blank.id, 'inv-3')
  assert.equal(blank.name, 'Invigilator 3')
})

test('duplicate invigilator ids are made unique', () => {
  const list = uniqueInvigilators([
    { id: 'i1', name: 'A' },
    { id: 'i1', name: 'B' },
  ])
  assert.deepEqual(list.map((item) => item.id), ['i1', 'i1-2'])
})

test('one invigilator per room, nobody is used twice', () => {
  const assignments = autoAssignInvigilators({
    rooms: ROOMS,
    invigilators: [inv('i1'), inv('i2'), inv('i3')],
    perRoom: 1,
  })
  assert.deepEqual(Object.keys(assignments).sort(), ['r1', 'r2', 'r3'])
  assertNoDoubleBooking(assignments)
  const used = Object.values(assignments).flat()
  assert.equal(new Set(used).size, 3)
})

test('N invigilators per room still never repeats a person', () => {
  const pool = [inv('i1'), inv('i2'), inv('i3'), inv('i4'), inv('i5'), inv('i6')]
  const assignments = autoAssignInvigilators({ rooms: ROOMS, invigilators: pool, perRoom: 2 })
  assertNoDoubleBooking(assignments)
  for (const room of ROOMS) assert.equal(assignments[room.id].length, 2)
  assert.equal(new Set(Object.values(assignments).flat()).size, 6)
})

test('a pool one person short leaves the last room short, never doubled', () => {
  const pool = [inv('i1'), inv('i2'), inv('i3'), inv('i4'), inv('i5')]
  const assignments = autoAssignInvigilators({ rooms: ROOMS, invigilators: pool, perRoom: 2 })
  assertNoDoubleBooking(assignments)
  assert.equal(assignments.r1.length, 2)
  assert.equal(assignments.r2.length, 2)
  assert.equal(assignments.r3.length, 1)
})

test('existing manual bookings are kept', () => {
  const assignments = autoAssignInvigilators({
    rooms: ROOMS,
    invigilators: [inv('i1'), inv('i2'), inv('i3')],
    perRoom: 1,
    existing: { r2: ['i3'] },
  })
  assert.deepEqual(assignments.r2, ['i3'])
  assertNoDoubleBooking(assignments)
})

test('a manual booking that clashes with another room is dropped, not doubled', () => {
  const assignments = autoAssignInvigilators({
    rooms: ROOMS,
    invigilators: [inv('i1'), inv('i2'), inv('i3')],
    perRoom: 1,
    // i1 is already busy in r1, so the stale r3 booking must be ignored
    existing: { r1: ['i1'], r3: ['i1'] },
  })
  assertNoDoubleBooking(assignments)
  assert.notDeepEqual(assignments.r3, ['i1'])
})

test('rooms are left short rather than double booked when people run out', () => {
  const assignments = autoAssignInvigilators({
    rooms: ROOMS,
    invigilators: [inv('i1')],
    perRoom: 2,
  })
  assertNoDoubleBooking(assignments)
  assert.deepEqual(assignments.r1, ['i1'])
  assert.deepEqual(assignments.r2, [])
  assert.deepEqual(assignments.r3, [])

  const short = staffingShortfalls({ rooms: ROOMS, assignments, perRoom: 2 })
  assert.equal(short.length, 3)
  // r1 got the only person, so it is one short; the others are two short
  assert.equal(short[0].missing, 1)
})

test('the same seed-free result is stable for the same input', () => {
  const options = {
    rooms: ROOMS,
    invigilators: [inv('i1'), inv('i2'), inv('i3'), inv('i4')],
    perRoom: 2,
  }
  assert.deepEqual(autoAssignInvigilators(options), autoAssignInvigilators(options))
})

test('the summary counts people once, never per room', () => {
  const assignments = autoAssignInvigilators({
    rooms: ROOMS,
    invigilators: [inv('i1'), inv('i2'), inv('i3')],
    perRoom: 1,
  })
  const summary = staffingSummary({ rooms: ROOMS, assignments, perRoom: 1 })
  assert.equal(summary.rooms, 3)
  assert.equal(summary.needed, 3)
  assert.equal(summary.booked, 3)
  assert.equal(summary.people, 3)
  assert.deepEqual(summary.shortfalls, [])
})

test('isBusyElsewhere spots a clash in another room only', () => {
  const assignments = { r1: ['i1'], r2: ['i2'] }
  assert.equal(isBusyElsewhere(assignments, 'r1', 'i1'), false)
  assert.equal(isBusyElsewhere(assignments, 'r2', 'i1'), true)
  assert.equal(isBusyElsewhere(assignments, 'r3', 'i2'), true)
})

test('empty input does not throw', () => {
  assert.deepEqual(autoAssignInvigilators({}), {})
  assert.deepEqual(staffingShortfalls({}), [])
  assert.equal(staffingSummary({}).needed, 0)
})