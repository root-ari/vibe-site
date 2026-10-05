/**
 * Pure search helpers: normalising a query (case, spacing, Bangla digits),
 * matching students, and turning a student id into one card per exam.
 * No React, no storage.
 */
import { buildRoomGrid } from './seating.js'
import { optionsFromPlan } from './print.js'

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯'

// Hyphens and zero-width marks that sneak in from copied spreadsheets.
const IGNORED = new Set(['-', '', '‌', '‍', '﻿'])

/** "২৪১-১৫-১০০১" -> "241-15-1001" so both digit systems match each other. */
export function toLatinDigits(value) {
  return String(value ?? '').replace(
    /[০-৯]/g,
    (digit) => String(BENGALI_DIGITS.indexOf(digit)),
  )
}

function dropIgnored(value) {
  return Array.from(value)
    .filter((char) => !IGNORED.has(char))
    .join('')
}

/** Lower-case, collapse runs of spaces, drop hyphens and zero-width marks. */
export function normalise(value) {
  return dropIgnored(toLatinDigits(value))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesAny(query, values) {
  if (!query) return false
  return values.some((value) => normalise(value).includes(query))
}

/** Match on id, name or course; a query must fit inside one field. */
export function matchesStudent(student, query) {
  const q = normalise(query)
  if (!q) return false
  return matchesAny(q, [student.id, student.name, student.course])
}

export function searchStudents(students, query, limit = 30) {
  const q = normalise(query)
  if (!q) return []
  return students
    .filter((student) => matchesStudent(student, q))
    .sort((a, b) => normalise(a.id).localeCompare(normalise(b.id)))
    .slice(0, limit)
}

/**
 * Bench a column belongs to, counted from the left of each row.
 * Returns null when the room is gone: an assignment can outlive the room it
 * points at, so callers must not assume the room still exists.
 */
export function benchOf(room, col) {
  if (!room) return null
  const per = Math.max(1, Math.min(Number(room.seatsPerBench) || 1, room.cols))
  return Math.floor((col - 1) / per) + 1
}

/** The students a search should look at, for the chosen scope. */
export function scopeStudents({ exams = [], students = [], scope = 'current', activeExamId = '' }) {
  const byId = new Map(students.map((student) => [String(student.id), student]))
  if (scope === 'all') {
    const ids = new Set()
    for (const exam of exams) {
      for (const id of exam.studentIds || []) ids.add(String(id))
    }
    return [...ids]
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => normalise(a.id).localeCompare(normalise(b.id)))
  }
  const exam = exams.find((item) => item.id === activeExamId)
  return (exam ? exam.studentIds || [] : [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
}

export function sortExamsByDate(exams) {
  return [...exams].sort((a, b) => {
    const dateA = a.date || ''
    const dateB = b.date || ''
    if (dateA !== dateB) return dateA < dateB ? -1 : 1
    const timeA = a.startTime || ''
    const timeB = b.startTime || ''
    if (timeA !== timeB) return timeA < timeB ? -1 : 1
    return (a.title || '').localeCompare(b.title || '')
  })
}

/** One card per exam this student is on, earliest first. */
export function buildResults({ studentId, exams = [], plans = {}, rooms = [] }) {
  const id = String(studentId)
  const cards = []
  for (const exam of exams) {
    if (!(exam.studentIds || []).map(String).includes(id)) continue
    const plan = plans[exam.id] || null
    const assignment = plan
      ? (plan.assignments || []).find((item) => String(item.studentId) === id) || null
      : null
    const unseated = Boolean(
      plan && (plan.unseated || []).map(String).includes(id),
    )
    const room = assignment
      ? rooms.find((item) => item.id === assignment.roomId) || null
      : null
    cards.push({
      exam,
      plan,
      assignment,
      room,
      status: assignment ? 'seated' : unseated ? 'unseated' : 'noplan',
    })
  }
  const order = sortExamsByDate(cards.map((card) => card.exam))
  return order.map((exam) => cards.find((card) => card.exam.id === exam.id))
}

/** A small grid for one room, with the student's seat marked. */
export function seatMap({ room, plan, assignment }) {
  if (!room) return null
  const grid = buildRoomGrid(room, optionsFromPlan(plan))
  for (const line of grid.cells) {
    for (const cell of line) {
      cell.here = Boolean(
        assignment && cell.row === assignment.row && cell.col === assignment.col,
      )
    }
  }
  return grid
}