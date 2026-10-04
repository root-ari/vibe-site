import test from 'node:test'
import assert from 'node:assert/strict'

import { SCHEMA_VERSION, createDefaultState, migrate } from './storage.js'

const student = (id) => ({ id, name: `S${id}`, course: 'CSE221', department: 'CSE', section: 'A' })
const STUDENTS = ['1', '2', '3'].map(student)

test('the default state is version 3 with two exams and no plans', () => {
  const state = createDefaultState()
  assert.equal(state.version, SCHEMA_VERSION)
  assert.equal(SCHEMA_VERSION, 3)
  assert.equal(state.exams.length, 2)
  assert.deepEqual(state.plans, {})
  assert.equal(state.activeExamId, state.exams[0].id)
  assert.equal(state.exams[0].studentIds.length, state.students.length)
  assert.equal(state.exams[1].studentIds.length, state.students.length)
  // the two sample exams use different, non overlapping slots
  assert.notEqual(state.exams[0].startTime, state.exams[1].startTime)
  assert.equal(state.invigilators.length, 4)
  assert.equal(state.exams[0].seating.invigilatorsPerRoom, 1)
  assert.deepEqual(state.exams[0].seating.lockedSeats, [])
})

test('v2 exams without a seating block are given safe defaults', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [{ id: 'e1', title: 'X', studentIds: ['1', '2'] }],
    activeExamId: 'e1',
  })
  const seating = state.exams[0].seating
  assert.deepEqual(Object.keys(seating).sort(), [
    'absentIds',
    'invigilatorAssignments',
    'invigilatorsPerRoom',
    'lockedSeats',
    'specialNeedsIds',
  ])
  assert.equal(seating.invigilatorsPerRoom, 1)
  assert.deepEqual(state.invigilators, [])
})

test('seating flags pointing at missing rooms, people or students are pruned', () => {
  const state = migrate({
    version: 3,
    students: STUDENTS,
    invigilators: [{ id: 'inv-1', name: 'Asha' }],
    rooms: [{ id: 'r1', name: 'A-101', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] }],
    exams: [
      {
        id: 'e1',
        title: 'X',
        studentIds: ['1', '2'],
        seating: {
          lockedSeats: ['r1:1,1', 'ghost:9,9'],
          absentIds: ['1', 'ghost'],
          specialNeedsIds: ['2', 'ghost2'],
          invigilatorsPerRoom: 99,
          invigilatorAssignments: { r1: ['inv-1', 'ghost'], ghost: ['inv-1'] },
        },
      },
    ],
    activeExamId: 'e1',
  })
  const seating = state.exams[0].seating
  assert.deepEqual(seating.lockedSeats, ['r1:1,1'])
  assert.deepEqual(seating.absentIds, ['1'])
  assert.deepEqual(seating.specialNeedsIds, ['2'])
  assert.equal(seating.invigilatorsPerRoom, 10, 'clamped to the allowed maximum')
  assert.deepEqual(seating.invigilatorAssignments, { r1: ['inv-1'] })
})

test('v1 data migrates: one exam, its roster and its plan', () => {
  const v1 = {
    version: 1,
    institution: { name: 'Uni', logo: null, language: 'en' },
    exam: { id: 'exam-1', title: 'Mid', date: '2026-05-12', startTime: '09:00', endTime: '12:00' },
    rooms: [{ id: 'r1', name: 'A-101', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [] }],
    students: STUDENTS,
    plan: {
      examId: 'exam-1',
      assignments: [{ studentId: '1', roomId: 'r1', roomName: 'A-101', row: 1, col: 1 }],
      unseated: ['3'],
      seed: 7,
      constraintsUsed: ['course-side'],
    },
  }
  const state = migrate(v1)
  assert.equal(state.version, 3)
  assert.equal(state.exams.length, 1)
  assert.equal(state.exams[0].id, 'exam-1')
  assert.equal(state.exams[0].title, 'Mid')
  // every existing student is carried onto the roster
  assert.deepEqual(state.exams[0].studentIds.sort(), ['1', '2', '3'])
  assert.equal(state.activeExamId, 'exam-1')
  // the old single plan is now keyed by exam id
  assert.ok(state.plans['exam-1'])
  assert.equal(state.plans['exam-1'].assignments.length, 1)
  assert.equal(state.plans['exam-1'].seed, 7)
  assert.equal(state.exam, undefined)
  assert.equal(state.plan, undefined)
})

test('v0 data with no exam still migrates without throwing', () => {
  const v0 = {
    rooms: [{ name: 'A-101', rows: 4, cols: 3, broken: [[1, 2]] }],
    students: STUDENTS,
  }
  const state = migrate(v0)
  assert.equal(state.version, 3)
  assert.deepEqual(state.exams, [])
  assert.equal(state.activeExamId, '')
  assert.equal(state.students.length, 3)
  // the legacy "broken" field is renamed on the way through
  assert.deepEqual(state.rooms[0].brokenSeats, [[1, 2]])
  assert.equal(state.rooms[0].rows, 4)
  assert.equal(state.rooms[0].cols, 3)
})

test('a newer schema is refused rather than mangled', () => {
  assert.throws(() => migrate({ version: 99 }), /bad-version/)
  assert.throws(() => migrate([]), /bad-json/)
  assert.throws(() => migrate(null), /bad-json/)
})

test('roster entries for unknown students are dropped', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [{ id: 'e1', title: 'X', studentIds: ['1', 'ghost', '2'] }],
    activeExamId: 'e1',
  })
  assert.deepEqual(state.exams[0].studentIds.sort(), ['1', '2'])
})

test('plans for exams that no longer exist are discarded', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [{ id: 'e1', title: 'X', studentIds: ['1'] }],
    activeExamId: 'e1',
    plans: {
      e1: { examId: 'e1', assignments: [{ studentId: '1', roomId: 'r1', row: 1, col: 1 }] },
      e9: { examId: 'e9', assignments: [{ studentId: '2', roomId: 'r1', row: 1, col: 2 }] },
    },
  })
  assert.ok(state.plans.e1)
  assert.equal(state.plans.e9, undefined)
})

test('each exam keeps its own plan and its own roster', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [
      { id: 'e1', title: 'One', studentIds: ['1', '2'] },
      { id: 'e2', title: 'Two', studentIds: ['3'] },
    ],
    activeExamId: 'e2',
    plans: {
      e1: { examId: 'e1', assignments: [{ studentId: '1', roomId: 'r1', row: 1, col: 1 }] },
      e2: { examId: 'e2', assignments: [{ studentId: '3', roomId: 'r2', row: 2, col: 1 }] },
    },
  })
  assert.equal(state.plans.e1.assignments[0].roomId, 'r1')
  assert.equal(state.plans.e2.assignments[0].roomId, 'r2')
  assert.equal(state.activeExamId, 'e2')
})

test('activeExamId falls back when the stored exam is gone', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [{ id: 'e1', title: 'One' }, { id: 'e2', title: 'Two' }],
    activeExamId: 'deleted',
  })
  assert.equal(state.activeExamId, 'e1')
})

test('duplicate exam ids are made unique', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [
      { id: 'e1', title: 'A' },
      { id: 'e1', title: 'B' },
    ],
    activeExamId: 'e1',
  })
  assert.deepEqual(state.exams.map((exam) => exam.id), ['e1', 'e1-2'])
  assert.equal(state.activeExamId, 'e1')
})

test('roster ids are de-duplicated and trimmed', () => {
  const state = migrate({
    version: 2,
    students: STUDENTS,
    exams: [{ id: 'e1', title: 'X', studentIds: [' 1 ', '1', '2', ''] }],
    activeExamId: 'e1',
  })
  assert.deepEqual(state.exams[0].studentIds.sort(), ['1', '2'])
})