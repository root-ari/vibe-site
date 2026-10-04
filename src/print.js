/**
 * Pure helpers for the print-ready outputs: room seat grids, door sheets,
 * attendance sheets, admit cards and the full plan CSV.
 *
 * The print layouts reuse the stored Plan and rebuild the same grids the seat
 * generator produced, by recovering the constraint options from the plan, so
 * what is printed always matches what was generated.
 */

import { hydratePlan, normalizeOptions } from './seating.js'
import { toCsv } from './parse.js'

export const SLIPS_PER_PAGE = 8

export function optionsFromPlan(plan) {
  const used = new Set((plan && plan.constraintsUsed) || [])
  return normalizeOptions({
    noSameCourseSideBySide: used.has('course-side'),
    noSameCourseFrontBack: used.has('course-frontback'),
    noSameDepartment: used.has('department'),
    skipAlternateBenches: used.has('skip-bench'),
    skipAlternateColumns: used.has('skip-column'),
    order: 'roll',
    seed: (plan && plan.seed) || 1,
    maxRetries: 0,
  })
}

export function studentIndex(students) {
  const map = new Map()
  for (const student of students || []) map.set(String(student.id), student)
  return map
}

// Rebuild the printable grids for a plan. Returns null when there is no plan.
export function buildPrintView({ plan, rooms, students, exam, institution, options }) {
  if (!plan) return null
  const opts = options || optionsFromPlan(plan)
  const result = hydratePlan(plan, rooms, students, opts)
  return { ...result, exam, institution }
}

function compareIds(a, b) {
  const x = String(a.studentId)
  const y = String(b.studentId)
  return x < y ? -1 : x > y ? 1 : 0
}

// Every seated student with the seat they occupy.
export function seatedList(result, byId) {
  const rows = []
  for (const room of result.rooms) {
    for (const line of room.cells) {
      for (const cell of line) {
        if (!cell.studentId) continue
        const student = byId.get(String(cell.studentId))
        rows.push({
          studentId: String(cell.studentId),
          name: student ? student.name : '',
          course: student ? student.course : '',
          department: student ? student.department : '',
          section: student ? student.section : '',
          roomId: room.roomId,
          roomName: room.name,
          row: cell.row,
          col: cell.col,
          seat: `${cell.row},${cell.col}`,
        })
      }
    }
  }
  return rows
}

// Door sheet: roll number order, optionally for a single room.
export function doorSheetRows(result, byId, roomId) {
  return seatedList(result, byId)
    .filter((row) => !roomId || row.roomId === roomId)
    .sort(compareIds)
}

// Attendance covers the whole roster, seated or not.
export function attendanceRows(result, byId, studentIds) {
  const seated = new Map(seatedList(result, byId).map((row) => [row.studentId, row]))
  const ids = (studentIds || [...byId.keys()]).map(String).sort()
  return ids.map((id) => {
    const student = byId.get(id)
    const seat = seated.get(id)
    return {
      studentId: id,
      name: student ? student.name : '',
      course: student ? student.course : '',
      department: student ? student.department : '',
      section: student ? student.section : '',
      roomId: seat ? seat.roomId : '',
      roomName: seat ? seat.roomName : '',
      row: seat ? seat.row : '',
      col: seat ? seat.col : '',
      seat: seat ? seat.seat : '',
      seated: Boolean(seat),
    }
  })
}

// Admit cards are ordered room by room, then front row to back.
export function admitCards(result, byId) {
  return seatedList(result, byId).sort(
    (a, b) =>
      (a.roomId < b.roomId ? -1 : a.roomId > b.roomId ? 1 : 0) ||
      a.row - b.row ||
      a.col - b.col,
  )
}

export function chunk(items, size) {
  const out = []
  const step = Math.max(1, Math.trunc(size) || 1)
  for (let i = 0; i < items.length; i += step) out.push(items.slice(i, i + step))
  return out
}

/* ------------------------------- CSV ----------------------------- */

// Stable machine tokens, deliberately not translated.
export function planCsv({ exam, institution, result, byId }) {
  const meta = exam || {}
  const header = [
    'institution',
    'exam_id',
    'exam_title',
    'exam_date',
    'start_time',
    'end_time',
    'student_id',
    'name',
    'course',
    'department',
    'section',
    'room',
    'row',
    'col',
    'status',
  ]
  const rows = attendanceRows(result, byId, [...byId.keys()]).map((row) => [
    institution ? institution.name : '',
    meta.id || '',
    meta.title || '',
    meta.date || '',
    meta.startTime || '',
    meta.endTime || '',
    row.studentId,
    row.name,
    row.course,
    row.department,
    row.section,
    row.roomName,
    row.row,
    row.col,
    row.seated ? 'seated' : 'unseated',
  ])
  return toCsv([header, ...rows])
}

export function planCsvFilename(exam) {
  const meta = exam || {}
  const id = String(meta.id || 'exam').replace(/[^a-z0-9_-]+/gi, '-')
  const date = String(meta.date || '').replace(/[^0-9]+/g, '')
  return `plan-${id}${date ? `-${date}` : ''}.csv`
}