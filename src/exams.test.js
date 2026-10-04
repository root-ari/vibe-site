import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addMonths,
  buildMonthCalendar,
  conflictingRoomIds,
  doubleBookedRooms,
  examsByDate,
  nextExamId,
  roomsUsedByPlan,
  slotsOverlap,
  studentClashes,
  timeToMinutes,
} from './exams.js'

const exam = (over) => ({
  id: 'e1',
  title: 'Exam',
  date: '2026-05-12',
  startTime: '09:00',
  endTime: '12:00',
  studentIds: [],
  ...over,
})

const planIn = (roomIds) => ({
  assignments: roomIds.map((roomId, i) => ({
    studentId: `s${i}`,
    roomId,
    roomName: roomId,
    row: 1,
    col: i + 1,
  })),
})

test('timeToMinutes parses HH:MM and rejects nonsense', () => {
  assert.equal(timeToMinutes('09:30'), 570)
  assert.equal(timeToMinutes('00:00'), 0)
  assert.equal(timeToMinutes('23:59'), 1439)
  assert.equal(timeToMinutes('9:05'), 545)
  assert.equal(timeToMinutes('24:00'), null)
  assert.equal(timeToMinutes('10:75'), null)
  assert.equal(timeToMinutes('abc'), null)
  assert.equal(timeToMinutes(''), null)
  assert.equal(timeToMinutes(null), null)
})

test('slotsOverlap only fires on the same date with real overlap', () => {
  const base = exam()
  assert.equal(slotsOverlap(base, exam({ id: 'e2', startTime: '11:00', endTime: '13:00' })), true)
  assert.equal(slotsOverlap(base, exam({ id: 'e2', startTime: '07:00', endTime: '08:00' })), false)
  // back to back is not an overlap
  assert.equal(slotsOverlap(base, exam({ id: 'e2', startTime: '12:00', endTime: '14:00' })), false)
  assert.equal(slotsOverlap(base, exam({ id: 'e2', startTime: '08:00', endTime: '09:00' })), false)
  // different day is never an overlap
  assert.equal(slotsOverlap(base, exam({ id: 'e2', date: '2026-05-13' })), false)
  // missing or unusable data is never an overlap
  assert.equal(slotsOverlap(base, exam({ id: 'e2', date: '' })), false)
  assert.equal(slotsOverlap(base, exam({ id: 'e2', startTime: 'nope' })), false)
  assert.equal(slotsOverlap(null, base), false)
  assert.equal(slotsOverlap(base, base), true)
})

test('roomsUsedByPlan collects distinct room ids', () => {
  assert.deepEqual(
    [...roomsUsedByPlan(planIn(['r1', 'r2', 'r1']))].sort(),
    ['r1', 'r2'],
  )
  assert.deepEqual([...roomsUsedByPlan(null)], [])
  assert.deepEqual([...roomsUsedByPlan({ assignments: [] })], [])
})

test('a room booked twice in overlapping slots is reported', () => {
  const exams = [
    exam({ id: 'e1', startTime: '09:00', endTime: '12:00' }),
    exam({ id: 'e2', startTime: '11:00', endTime: '13:00' }),
  ]
  const plans = { e1: planIn(['a-101']), e2: planIn(['a-101']) }
  const clashes = doubleBookedRooms({ exams, plans })
  assert.equal(clashes.length, 1)
  assert.equal(clashes[0].roomId, 'a-101')
  assert.equal(clashes[0].overlapping.length, 1)
})

test('the same room in separate slots is not a double booking', () => {
  const exams = [
    exam({ id: 'e1', startTime: '09:00', endTime: '12:00' }),
    exam({ id: 'e2', startTime: '14:00', endTime: '17:00' }),
  ]
  const plans = { e1: planIn(['a-101', 'a-102']), e2: planIn(['a-101']) }
  assert.deepEqual(doubleBookedRooms({ exams, plans }), [])
})

test('conflictingRoomIds blocks rooms an overlapping exam already uses', () => {
  const exams = [
    exam({ id: 'e1', startTime: '09:00', endTime: '12:00' }),
    exam({ id: 'e2', startTime: '11:00', endTime: '13:00' }),
    exam({ id: 'e3', startTime: '14:00', endTime: '16:00' }),
  ]
  const plans = { e2: planIn(['a-101', 'a-102']), e3: planIn(['a-103']) }
  const blocked = conflictingRoomIds({ exams, plans, activeExamId: 'e1' })
  assert.deepEqual([...blocked].sort(), ['a-101', 'a-102'])
  assert.equal(blocked.has('a-103'), false)
})

test('conflictingRoomIds is empty without an active exam', () => {
  assert.deepEqual([...conflictingRoomIds({ exams: [exam()], activeExamId: '' })], [])
})

test('a student in two exams at the same time is reported', () => {
  const exams = [
    exam({ id: 'e1', studentIds: ['s1', 's2'] }),
    exam({ id: 'e2', startTime: '11:00', endTime: '13:00', studentIds: ['s2', 's3'] }),
  ]
  const clashes = studentClashes({ exams })
  assert.equal(clashes.length, 1)
  assert.equal(clashes[0].studentId, 's2')
  assert.equal(clashes[0].pairs.length, 1)
})

test('a student in two exams at different times is fine', () => {
  const exams = [
    exam({ id: 'e1', studentIds: ['s1'] }),
    exam({ id: 'e2', startTime: '14:00', endTime: '17:00', studentIds: ['s1'] }),
  ]
  assert.deepEqual(studentClashes({ exams }), [])
})

test('nextExamId returns the first free slot', () => {
  assert.equal(nextExamId([]), 'exam-1')
  assert.equal(nextExamId([exam({ id: 'exam-1' })]), 'exam-2')
  assert.equal(
    nextExamId([exam({ id: 'exam-1' }), exam({ id: 'exam-2' }), exam({ id: 'exam-9' })]),
    'exam-3',
  )
  assert.equal(nextExamId(null), 'exam-1')
})

test('the month calendar is always 6 weeks of 7 days', () => {
  const weeks = buildMonthCalendar(2026, 4) // May 2026
  assert.equal(weeks.length, 6)
  assert.ok(weeks.every((week) => week.length === 7))
  assert.equal(weeks.flat().length, 42)
  // 1 May 2026 is a Friday, so the grid starts on Sunday 26 April
  assert.equal(weeks[0][0].date, '2026-04-26')
  assert.equal(weeks[0][0].inMonth, false)
  assert.equal(weeks[0][4].date, '2026-04-30')
  assert.equal(weeks[0][5].date, '2026-05-01')
  assert.equal(weeks[0][5].inMonth, true)
  assert.equal(weeks[5][0].date, '2026-05-31')
  assert.equal(weeks[5][6].date, '2026-06-06')
  assert.equal(weeks.flat().filter((cell) => cell.inMonth).length, 31)
  // every date key is unique and strictly increasing
  const dates = weeks.flat().map((cell) => cell.date)
  assert.equal(new Set(dates).size, 42)
  assert.deepEqual(dates, [...dates].sort())
})

test('the calendar handles a month that starts on Sunday', () => {
  // 1 March 2026 is a Sunday, so nothing spills in from February
  const weeks = buildMonthCalendar(2026, 2)
  assert.equal(weeks[0][0].date, '2026-03-01')
  assert.equal(weeks[0][0].inMonth, true)
  // 31 March falls on index 2 of the fifth week
  assert.equal(weeks[4][2].date, '2026-03-31')
  assert.equal(weeks[4][2].inMonth, true)
  assert.equal(weeks.flat().filter((cell) => cell.inMonth).length, 31)
})

test('addMonths rolls across the year boundary in both directions', () => {
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 })
  assert.deepEqual(addMonths(2026, 0, -1), { year: 2025, month: 11 })
  assert.deepEqual(addMonths(2026, 4, 0), { year: 2026, month: 4 })
  assert.deepEqual(addMonths(2026, 4, 8), { year: 2027, month: 0 })
})

test('examsByDate groups by day and ignores undated exams', () => {
  const map = examsByDate([
    exam({ id: 'e1', date: '2026-05-12' }),
    exam({ id: 'e2', date: '2026-05-12' }),
    exam({ id: 'e3', date: '2026-05-20' }),
    exam({ id: 'e4', date: '' }),
  ])
  assert.equal(map.get('2026-05-12').length, 2)
  assert.equal(map.get('2026-05-20').length, 1)
  assert.equal(map.has(''), false)
  assert.equal(map.has(undefined), false)
})

test('empty inputs never throw', () => {
  assert.deepEqual(doubleBookedRooms({}), [])
  assert.deepEqual(studentClashes({}), [])
  assert.equal(examsByDate([]).size, 0)
  assert.equal(buildMonthCalendar(2026, 4).length, 6)
})