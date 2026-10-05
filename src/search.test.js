import test from 'node:test'
import assert from 'node:assert/strict'

import {
  benchOf,
  buildResults,
  matchesStudent,
  normalise,
  scopeStudents,
  searchStudents,
  seatMap,
  sortExamsByDate,
  toLatinDigits,
} from './search.js'

const STUDENTS = [
  { id: '241-15-1001', name: 'Rahim Uddin', course: 'CSE221' },
  { id: '241-16-2001', name: 'নুসরাত জাহান', course: 'MAT201' },
  { id: '241-17-3001', name: 'Tanvir Ahmed', course: 'ENG101' },
]

const ROOM = { id: 'r1', name: 'A-101', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] }

test('Bangla digits are converted to Latin', () => {
  assert.equal(toLatinDigits('২৪১-১৫-১০০১'), '241-15-1001')
  assert.equal(toLatinDigits('১২৩'), '123')
  assert.equal(toLatinDigits('12৩'), '123')
  assert.equal(toLatinDigits('abc'), 'abc')
  assert.equal(toLatinDigits(null), '')
})

test('normalising lower-cases and collapses extra spaces', () => {
  assert.equal(normalise('  Rahim   UDDIN '), 'rahim uddin')
  assert.equal(normalise('a\t\tb'), 'a b')
  assert.equal(normalise('১  ২'), '1 2')
})

test('a student matches on id, partial name, or course, any case', () => {
  const s = STUDENTS[0]
  assert.equal(matchesStudent(s, '241-15-1001'), true)
  assert.equal(matchesStudent(s, '1001'), true)
  assert.equal(matchesStudent(s, 'rahim'), true)
  assert.equal(matchesStudent(s, 'RAHIM   uddin'), true)
  assert.equal(matchesStudent(s, 'cse221'), true)
  assert.equal(matchesStudent(s, 'nobody'), false)
  assert.equal(matchesStudent(s, ''), false)
})

test('Bangla names and Bangla digits in the query both work', () => {
  assert.equal(matchesStudent(STUDENTS[1], 'নুসরাত'), true)
  assert.equal(matchesStudent(STUDENTS[1], 'জাহান'), true)
  assert.equal(matchesStudent(STUDENTS[1], '২৪১-১৬-২০০১'), true)
})

test('searching returns matching students sorted by id', () => {
  assert.deepEqual(searchStudents(STUDENTS, 'a').map((s) => s.id), [
    '241-15-1001',
    '241-16-2001',
    '241-17-3001',
  ])
  assert.deepEqual(searchStudents(STUDENTS, 'zzz'), [])
  assert.deepEqual(searchStudents(STUDENTS, ''), [])
  assert.equal(searchStudents(STUDENTS, 'a', 2).length, 2)
})

test('the scope is either the active exam or every exam', () => {
  const exams = [
    { id: 'e1', studentIds: ['241-15-1001', '241-16-2001'] },
    { id: 'e2', studentIds: ['241-17-3001'] },
  ]
  const current = scopeStudents({ exams, students: STUDENTS, scope: 'current', activeExamId: 'e1' })
  assert.deepEqual(current.map((s) => s.id), ['241-15-1001', '241-16-2001'])

  const all = scopeStudents({ exams, students: STUDENTS, scope: 'all' })
  assert.equal(all.length, 3)

  const none = scopeStudents({ exams, students: STUDENTS, scope: 'current', activeExamId: 'gone' })
  assert.deepEqual(none, [])
})

test('benches are counted from the left of each row', () => {
  assert.equal(benchOf({ cols: 4, seatsPerBench: 2 }, 1), 1)
  assert.equal(benchOf({ cols: 4, seatsPerBench: 2 }, 2), 1)
  assert.equal(benchOf({ cols: 4, seatsPerBench: 2 }, 3), 2)
  assert.equal(benchOf({ cols: 4, seatsPerBench: 2 }, 4), 2)
  assert.equal(benchOf({ cols: 3, seatsPerBench: 3 }, 2), 1)
})

test('exams are sorted by date then start time', () => {
  const sorted = sortExamsByDate([
    { id: 'c', title: 'C', date: '2026-05-20', startTime: '09:00' },
    { id: 'a', title: 'A', date: '2026-05-12', startTime: '14:00' },
    { id: 'b', title: 'B', date: '2026-05-12', startTime: '09:00' },
  ])
  assert.deepEqual(sorted.map((e) => e.id), ['b', 'a', 'c'])
})

const EXAMS = [
  { id: 'e2', title: 'Later', date: '2026-06-01', startTime: '09:00', endTime: '12:00', studentIds: ['S1'] },
  { id: 'e1', title: 'Earlier', date: '2026-05-12', startTime: '09:00', endTime: '12:00', studentIds: ['S1', 'S2'] },
]

test('a student on several exams gets a card per exam, earliest first', () => {
  const results = buildResults({
    studentId: 'S1',
    exams: EXAMS,
    plans: { e1: { assignments: [], unseated: ['S1'] }, e2: { assignments: [], unseated: [] } },
    rooms: [ROOM],
  })
  assert.deepEqual(results.map((r) => r.exam.id), ['e1', 'e2'])
  assert.equal(results[0].status, 'unseated')
  assert.equal(results[1].status, 'noplan')
})

test('a seated student is matched to the room and seat', () => {
  const plans = {
    e1: {
      assignments: [{ studentId: 'S1', roomId: 'r1', roomName: 'A-101', row: 2, col: 1 }],
      unseated: [],
    },
  }
  const [card] = buildResults({ studentId: 'S1', exams: [EXAMS[1]], plans, rooms: [ROOM] })
  assert.equal(card.status, 'seated')
  assert.equal(card.room.name, 'A-101')
  assert.equal(card.assignment.row, 2)
})

test('students not on an exam roster get no card for it', () => {
  const results = buildResults({ studentId: 'S2', exams: EXAMS, plans: {}, rooms: [ROOM] })
  assert.deepEqual(results.map((r) => r.exam.id), ['e1'])
})

test('the seat map marks exactly the student seat', () => {
  const plan = {
    assignments: [{ studentId: 'S1', roomId: 'r1', row: 2, col: 1 }],
    unseated: [],
    constraintsUsed: [],
  }
  const grid = seatMap({ room: ROOM, plan, assignment: plan.assignments[0] })
  const here = grid.cells.flat().filter((cell) => cell.here)
  assert.equal(here.length, 1)
  assert.equal(here[0].row, 2)
  assert.equal(here[0].col, 1)
  assert.equal(seatMap({ room: null }), null)
})