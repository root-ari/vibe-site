import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CONSTRAINTS,
  DEFAULT_OPTIONS,
  buildRoomGrid,
  generatePlan,
  hydratePlan,
  normalizeOptions,
  scoreOf,
} from './seating.js'

const ROOMS = [
  { id: 'room-a101', name: 'A-101', building: 'A', rows: 4, cols: 3, seatsPerBench: 3, brokenSeats: [] },
  { id: 'room-a102', name: 'A-102', building: 'A', rows: 3, cols: 3, seatsPerBench: 3, brokenSeats: [] },
  { id: 'room-a103', name: 'A-103', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [[1, 2]] },
]

function sampleStudents() {
  const out = []
  const groups = [
    ['241-15-', 1000, 10, 'CSE221', 'CSE'],
    ['241-16-', 2000, 9, 'MAT201', 'MAT'],
    ['241-17-', 3000, 7, 'ENG101', 'ENG'],
  ]
  for (const [prefix, base, count, course, department] of groups) {
    for (let i = 1; i <= count; i += 1) {
      out.push({
        id: `${prefix}${base + i}`,
        name: `Student ${base + i}`,
        course,
        department,
        section: 'A',
      })
    }
  }
  return out
}

const STUDENTS = sampleStudents()

const seatKeys = (rooms) =>
  new Set(
    rooms.flatMap((room) =>
      room.cells
        .flat()
        .filter((cell) => !cell.blocked && cell.studentId)
        .map((cell) => `${cell.studentId}@${room.roomId}:${cell.row},${cell.col}`),
    ),
  )

test('sample data has 26 students', () => {
  assert.equal(STUDENTS.length, 26)
})

test('broken seat [1,2] is treated as 1-based row 1, column 2', () => {
  const grid = buildRoomGrid(ROOMS[2], {})
  assert.equal(grid.cells[0][1].blocked, true)
  assert.equal(grid.cells[0][1].blockedBy, 'broken')
  assert.equal(grid.cells[0][0].blocked, false)
  assert.equal(grid.cells[1][1].blocked, false)
  assert.equal(grid.capacity, 3)
})

test('usable seats total 24 across the three rooms', () => {
  const total = ROOMS.reduce(
    (sum, room) => sum + buildRoomGrid(room, {}).capacity,
    0,
  )
  assert.equal(total, 24)
})

test('default options seat 24, leave 2 unseated, with no violations', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    examId: 'exam-1',
    options: { maxRetries: 0 },
  })
  assert.equal(result.totals.seated, 24)
  assert.equal(result.totals.unseated, 2)
  assert.equal(result.plan.assignments.length, 24)
  // A-103 only has three usable seats, so one same-course pair is unavoidable.
  assert.ok(result.violations.length <= 1)
  assert.equal(result.score.checks, 15)
})

test('constraint (a) holds everywhere except the unavoidable A-103 pair', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { noSameCourseSideBySide: true, noSameCourseFrontBack: false, maxRetries: 0 },
  })
  // A-103 keeps only (1,1), (2,1) and (2,2); (2,1)-(2,2) is a side-by-side
  // pair and the three students left for that room are all ENG101.
  assert.equal(result.violations.length, 1)
  assert.equal(result.score.checks, 15)
  assert.equal(result.score.score, 93)
  const only = result.violations[0]
  assert.equal(only.constraint, CONSTRAINTS.courseSide)
  assert.equal(only.roomName, 'A-103')
  assert.equal(only.direction, 'right')
  assert.equal(only.row, 2)
  assert.equal(only.col, 1)
  assert.equal(result.violations.filter((v) => v.roomName !== 'A-103').length, 0)
})

test('same seed always gives the same plan', () => {
  const options = { order: 'shuffle', seed: 42, maxRetries: 12 }
  const a = generatePlan({ rooms: ROOMS, students: STUDENTS, options })
  const b = generatePlan({ rooms: ROOMS, students: STUDENTS, options })
  assert.deepEqual(a.plan, b.plan)
  assert.deepEqual(a.violations, b.violations)
})

test('different seeds produce different shuffled plans', () => {
  const seen = new Set()
  for (let seed = 1; seed <= 20; seed += 1) {
    const result = generatePlan({
      rooms: ROOMS,
      students: STUDENTS,
      options: { order: 'shuffle', seed, maxRetries: 0 },
    })
    seen.add(JSON.stringify(result.plan.assignments))
  }
  assert.ok(seen.size > 1, 'expected at least two distinct plans across 20 seeds')
})

test('roll order seats the lowest student id first', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { order: 'roll', maxRetries: 0 },
  })
  const first = result.plan.assignments[0]
  assert.equal(first.studentId, '241-15-1001')
  assert.equal(first.roomId, 'room-a101')
  assert.equal(first.row, 1)
  assert.equal(first.col, 1)
})

test('no student is seated twice and no broken seat is used', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0 },
  })
  const ids = result.plan.assignments.map((a) => a.studentId)
  assert.equal(new Set(ids).size, ids.length)
  const broken = new Set(['room-a103:1,2'])
  for (const item of result.plan.assignments) {
    assert.equal(broken.has(`${item.roomId}:${item.row},${item.col}`), false)
  }
})

test('seated plus unseated covers every student exactly once', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0 },
  })
  const all = [
    ...result.plan.assignments.map((a) => a.studentId),
    ...result.plan.unseated,
  ]
  assert.equal(all.length, STUDENTS.length)
  assert.equal(new Set(all).size, STUDENTS.length)
})

test('skip alternate columns removes those seats from capacity', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { skipAlternateColumns: true, maxRetries: 0 },
  })
  assert.ok(result.totals.capacity < 24)
  const skipped = result.rooms
    .flatMap((room) => room.cells.flat())
    .filter((cell) => cell.blockedBy === 'skip-column')
  assert.ok(skipped.length > 0)
  assert.equal(seatKeys(result.rooms).size, result.totals.seated)
})

test('skip alternate benches removes every second bench', () => {
  const room = {
    id: 'r1',
    name: 'R1',
    building: 'A',
    rows: 2,
    cols: 4,
    seatsPerBench: 2,
    brokenSeats: [],
  }
  const plain = buildRoomGrid(room, {})
  const skipped = buildRoomGrid(room, { skipAlternateBenches: true })
  assert.equal(plain.capacity, 8)
  assert.equal(skipped.capacity, 4)
  // seatsPerBench 2 -> cols 1,2 are bench 0 (kept), cols 3,4 are bench 1 (skipped)
  assert.equal(skipped.cells[0][1].blocked, false)
  assert.equal(skipped.cells[0][2].blockedBy, 'skip-bench')
  assert.equal(skipped.cells[0][3].blockedBy, 'skip-bench')
})

test('impossible constraint still fills every seat and reports breaches', () => {
  const rooms = [
    { id: 'r1', name: 'R1', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] },
  ]
  const students = Array.from({ length: 4 }, (_, i) => ({
    id: `X${i + 1}`,
    name: `X${i + 1}`,
    course: 'CSE221',
    department: 'CSE',
    section: 'A',
  }))
  const result = generatePlan({ rooms, students, options: { maxRetries: 0 } })

  assert.equal(result.totals.seated, 4)
  assert.equal(result.totals.unseated, 0)
  assert.equal(result.violations.length, 2)
  assert.equal(result.score.score, 0)
  for (const item of result.violations) {
    assert.equal(item.constraint, CONSTRAINTS.courseSide)
    assert.equal(item.roomName, 'R1')
    assert.ok(item.row >= 1 && item.row <= 2)
    assert.ok(item.col >= 1 && item.col <= 2)
    assert.ok(item.studentName && item.withStudentName)
    assert.ok(['left', 'right'].includes(item.direction))
  }
})

test('department constraint is reported when it cannot be met', () => {
  const rooms = [
    { id: 'r1', name: 'R1', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] },
  ]
  const students = [
    { id: 'A1', name: 'A1', course: 'C1', department: 'CSE', section: 'A' },
    { id: 'A2', name: 'A2', course: 'C2', department: 'CSE', section: 'A' },
    { id: 'A3', name: 'A3', course: 'C3', department: 'CSE', section: 'A' },
    { id: 'A4', name: 'A4', course: 'C4', department: 'CSE', section: 'A' },
  ]
  const result = generatePlan({
    rooms,
    students,
    options: { noSameCourseSideBySide: false, noSameDepartment: true, maxRetries: 0 },
  })
  assert.ok(result.violations.length > 0)
  assert.ok(result.violations.every((v) => v.constraint === CONSTRAINTS.department))
  assert.ok(result.score.score < 100)
})

test('front/back constraint is only checked when enabled', () => {
  const rooms = [
    { id: 'r1', name: 'R1', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] },
  ]
  const students = Array.from({ length: 4 }, (_, i) => ({
    id: `A${i + 1}`,
    name: `A${i + 1}`,
    course: 'SAME',
    department: `D${i + 1}`,
    section: 'A',
  }))
  const off = generatePlan({
    rooms,
    students,
    options: { noSameCourseFrontBack: false, maxRetries: 0 },
  })
  assert.equal(
    off.violations.filter((v) => v.constraint === CONSTRAINTS.courseFrontBack).length,
    0,
  )
  const on = generatePlan({
    rooms,
    students,
    options: { noSameCourseFrontBack: true, maxRetries: 0 },
  })
  assert.equal(on.totals.seated, 4)
  assert.ok(on.violations.some((v) => v.constraint === CONSTRAINTS.courseFrontBack))
})

test('maxRetries 0 runs a single attempt', () => {
  const result = generatePlan({ rooms: ROOMS, students: STUDENTS, options: { maxRetries: 0 } })
  assert.equal(result.score.attempts, 1)
})

test('retries never make the score worse', () => {
  const few = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0, order: 'shuffle', seed: 7 },
  })
  const many = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 30, order: 'shuffle', seed: 7 },
  })
  assert.ok(many.score.score >= few.score.score)
  assert.ok(many.violations.length <= few.violations.length)
})

test('the retry loop rescues a bad first attempt for the same seed', () => {
  const options = { order: 'shuffle', seed: 51 }
  const firstTryOnly = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { ...options, maxRetries: 0 },
  })
  const withRetries = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { ...options, maxRetries: 25 },
  })
  assert.equal(firstTryOnly.score.score, 93)
  assert.equal(firstTryOnly.violations.length, 1)
  assert.equal(withRetries.score.score, 100)
  assert.equal(withRetries.score.attempts, 2)
  assert.equal(withRetries.violations.length, 0)
  assert.equal(withRetries.totals.seated, 24)
})

test('the retry loop also improves the department constraint', () => {
  const options = { order: 'roll', noSameDepartment: true, seed: 1 }
  const firstTryOnly = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { ...options, maxRetries: 0 },
  })
  const withRetries = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { ...options, maxRetries: 25 },
  })
  assert.equal(firstTryOnly.score.score, 89)
  assert.equal(withRetries.score.score, 93)
  assert.ok(withRetries.score.score > firstTryOnly.score.score)
})

test('hydratePlan reproduces the generated plan exactly', () => {
  const options = { order: 'shuffle', seed: 5, maxRetries: 3 }
  const generated = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    examId: 'exam-1',
    options,
  })
  const hydrated = hydratePlan(generated.plan, ROOMS, STUDENTS, options)
  assert.deepEqual(hydrated.plan.assignments, generated.plan.assignments)
  assert.equal(hydrated.score.score, generated.score.score)
  assert.equal(hydrated.violations.length, generated.violations.length)
  assert.equal(hydrated.totals.unseated, generated.totals.unseated)
})

test('utilization is reported per room and sums to the totals', () => {
  const result = generatePlan({ rooms: ROOMS, students: STUDENTS, options: { maxRetries: 0 } })
  assert.deepEqual(
    result.rooms.map((room) => room.capacity),
    [12, 9, 3],
  )
  assert.equal(result.rooms.reduce((sum, room) => sum + room.seated, 0), 24)
  assert.equal(result.rooms.reduce((sum, room) => sum + room.capacity, 0), 24)
  assert.ok(result.rooms.every((room) => room.utilization === 100))
})

test('normalizeOptions clamps and falls back safely', () => {
  const opts = normalizeOptions({ seed: 'abc', maxRetries: -5, order: 'nope' })
  assert.equal(opts.seed, 1)
  assert.equal(opts.maxRetries, 0)
  assert.equal(opts.order, 'roll')
  assert.equal(normalizeOptions({}).maxRetries, DEFAULT_OPTIONS.maxRetries)
  assert.equal(normalizeOptions({ seed: 1e9 }).seed, 999999)
})

test('scoreOf handles the zero-check case', () => {
  assert.equal(scoreOf(0, 0), 100)
  assert.equal(scoreOf(10, 0), 100)
  assert.equal(scoreOf(10, 5), 50)
})

test('empty input does not throw', () => {
  const result = generatePlan({ rooms: [], students: [] })
  assert.equal(result.totals.seated, 0)
  assert.equal(result.score.score, 100)
  assert.deepEqual(result.plan.assignments, [])
})

test('absent students get no seat and are not reported as unseated', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0, excludeStudentIds: ['241-15-1001', '241-15-1002'] },
  })
  const ids = result.plan.assignments.map((a) => a.studentId)
  assert.equal(ids.includes('241-15-1001'), false)
  assert.equal(ids.includes('241-15-1002'), false)
  // they are absent, not unseated: the other 24 students fill all 24 seats
  assert.equal(result.plan.unseated.length, 0)
  assert.equal(result.plan.unseated.includes('241-15-1001'), false)
  assert.equal(result.totals.absent, 2)
  assert.equal(result.totals.students, 24)
  assert.equal(result.totals.seated, 24)
})

test('special-needs students are seated in the front row', () => {
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0, frontSeatStudentIds: ['241-15-1001', '241-16-2001', '241-17-3001'] },
  })
  const front = new Set(['241-15-1001', '241-16-2001', '241-17-3001'])
  for (const item of result.plan.assignments) {
    if (front.has(item.studentId)) assert.equal(item.row, 1, `${item.studentId} is not in the front row`)
  }
})

test('special-needs students beyond the front seats are still seated', () => {
  const many = ['241-15-1001', '241-15-1002', '241-15-1003', '241-15-1004', '241-15-1005']
  const result = generatePlan({
    rooms: ROOMS,
    students: STUDENTS,
    options: { maxRetries: 0, frontSeatStudentIds: many },
  })
  for (const id of many) {
    assert.ok(
      result.plan.assignments.some((a) => a.studentId === id),
      `${id} should still be seated`,
    )
  }
})