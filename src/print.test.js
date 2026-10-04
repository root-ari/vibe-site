import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SLIPS_PER_PAGE,
  admitCards,
  attendanceRows,
  buildPrintView,
  chunk,
  doorSheetRows,
  optionsFromPlan,
  planCsv,
  planCsvFilename,
  seatedList,
  studentIndex,
} from './print.js'

const ROOMS = [
  { id: 'r1', name: 'A-101', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] },
  { id: 'r2', name: 'A-102', building: 'A', rows: 1, cols: 2, seatsPerBench: 2, brokenSeats: [] },
]

const STUDENTS = [
  { id: 'S2', name: 'Bokar, Jr.', course: 'CSE221', department: 'CSE', section: 'A' },
  { id: 'S1', name: 'নুসরাত জাহান', course: 'MAT201', department: 'MAT', section: 'A' },
  { id: 'S4', name: 'Tanvir "T" Ahmed', course: 'ENG101', department: 'ENG', section: 'B' },
  { id: 'S3', name: 'Rahim Uddin', course: 'CSE221', department: 'CSE', section: 'A' },
]

const EXAM = { id: 'exam-1', title: 'Mid Term', date: '2026-05-12', startTime: '09:00', endTime: '12:00' }
const INSTITUTION = { name: 'Example University', logo: null, language: 'en' }

const PLAN = {
  examId: 'exam-1',
  assignments: [
    { studentId: 'S2', roomId: 'r1', roomName: 'A-101', row: 1, col: 2 },
    { studentId: 'S1', roomId: 'r1', roomName: 'A-101', row: 2, col: 1 },
    { studentId: 'S4', roomId: 'r2', roomName: 'A-102', row: 1, col: 1 },
  ],
  unseated: ['S3'],
  seed: 5,
  constraintsUsed: ['course-side'],
}

const view = buildPrintView({
  plan: PLAN,
  rooms: ROOMS,
  students: STUDENTS,
  exam: EXAM,
  institution: INSTITUTION,
})
const byId = studentIndex(STUDENTS)

test('constraint options are recovered from the stored plan', () => {
  const plain = optionsFromPlan(PLAN)
  assert.equal(plain.noSameCourseSideBySide, true)
  assert.equal(plain.noSameCourseFrontBack, false)
  assert.equal(plain.noSameDepartment, false)
  assert.equal(plain.skipAlternateColumns, false)
  assert.equal(plain.seed, 5)

  const skipping = optionsFromPlan({
    constraintsUsed: ['course-side', 'course-frontback', 'department', 'skip-bench', 'skip-column'],
  })
  assert.equal(skipping.skipAlternateBenches, true)
  assert.equal(skipping.skipAlternateColumns, true)
  assert.equal(skipping.noSameDepartment, true)
})

test('there is no print view without a plan', () => {
  assert.equal(buildPrintView({ plan: null, rooms: ROOMS, students: STUDENTS }), null)
})

test('seatedList returns one row per seated student with its seat', () => {
  const rows = seatedList(view, byId)
  assert.equal(rows.length, 3)
  const first = rows.find((row) => row.studentId === 'S1')
  assert.equal(first.seat, '2,1')
  assert.equal(first.roomName, 'A-101')
  assert.equal(first.name, 'নুসরাত জাহান')
  assert.equal(first.course, 'MAT201')
})

test('the door sheet is filtered by room and sorted by roll number', () => {
  const all = doorSheetRows(view, byId, '')
  assert.equal(all.length, 3)
  assert.deepEqual(all.map((row) => row.studentId), ['S1', 'S2', 'S4'])

  const one = doorSheetRows(view, byId, 'r1')
  assert.equal(one.length, 2)
  assert.deepEqual(one.map((row) => row.studentId), ['S1', 'S2'])
  assert.deepEqual(one.map((row) => row.seat), ['2,1', '1,2'])
})

test('the attendance sheet covers seated and unseated students', () => {
  const rows = attendanceRows(view, byId, [...byId.keys()])
  assert.equal(rows.length, 4)
  assert.deepEqual(rows.map((row) => row.studentId), ['S1', 'S2', 'S3', 'S4'])

  const unseated = rows.find((row) => row.studentId === 'S3')
  assert.equal(unseated.seated, false)
  assert.equal(unseated.roomName, '')
  assert.equal(unseated.seat, '')
  // the student still appears, so nothing is silently dropped from the register
  assert.equal(unseated.name, 'Rahim Uddin')
})

test('admit cards are ordered room by room then front to back', () => {
  const cards = admitCards(view, byId)
  assert.equal(cards.length, 3)
  assert.deepEqual(cards.map((card) => `${card.roomId}:${card.row},${card.col}`), [
    'r1:1,2',
    'r1:2,1',
    'r2:1,1',
  ])
})

test('chunk splits into pages of eight for admit cards', () => {
  assert.equal(SLIPS_PER_PAGE, 8)
  const items = Array.from({ length: 24 }, (_, i) => i + 1)
  const pages = chunk(items, SLIPS_PER_PAGE)
  assert.equal(pages.length, 3)
  assert.equal(pages[0].length, 8)
  assert.equal(pages[2].length, 8)
  assert.deepEqual(pages[0], [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(chunk([1, 2], 8), [[1, 2]])
  assert.deepEqual(chunk([], 8), [])
})

test('the plan CSV has a stable header, every student and both statuses', () => {
  const csv = planCsv({ exam: EXAM, institution: INSTITUTION, result: view, byId })
  const lines = csv.split('\r\n')
  assert.equal(lines.length, 5)
  assert.equal(
    lines[0],
    'institution,exam_id,exam_title,exam_date,start_time,end_time,student_id,name,course,department,section,room,row,col,status',
  )
  assert.ok(lines[1].startsWith('Example University,exam-1,Mid Term,2026-05-12,09:00,12:00,S1,'))
  assert.ok(csv.includes('seated'))
  assert.ok(csv.includes('unseated'))
  // the unseated student is in the export, with no seat
  assert.ok(csv.includes('S3,Rahim Uddin,CSE221,CSE,A,,,,unseated'))
})

test('the plan CSV quotes names containing commas and quotes', () => {
  const csv = planCsv({ exam: EXAM, institution: INSTITUTION, result: view, byId })
  assert.ok(csv.includes('"Bokar, Jr."'))
  assert.ok(csv.includes('"Tanvir ""T"" Ahmed"'))
})

test('Bangla names are written through to the CSV unchanged', () => {
  const csv = planCsv({ exam: EXAM, institution: INSTITUTION, result: view, byId })
  assert.ok(csv.includes('নুসরাত জাহান'))
})

test('the CSV filename is built from the exam id and date', () => {
  assert.equal(planCsvFilename(EXAM), 'plan-exam-1-20260512.csv')
  assert.equal(planCsvFilename({ id: 'a/b c', date: '' }), 'plan-a-b-c.csv')
  assert.equal(planCsvFilename(null), 'plan-exam.csv')
})