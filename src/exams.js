/**
 * Pure scheduling helpers for multiple exams: time-slot overlap, room
 * double-booking, student clashes and a month calendar grid.
 * No React, no storage - everything is a function of its inputs.
 */

export function timeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

// Two slots clash only on the same date with genuinely overlapping times.
// Back-to-back slots (12:00 end / 12:00 start) are not an overlap.
export function slotsOverlap(a, b) {
  if (!a || !b) return false
  if (!a.date || !b.date || a.date !== b.date) return false
  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false
  return aStart < bEnd && bStart < aEnd
}

export function roomsUsedByPlan(plan) {
  const used = new Set()
  for (const item of (plan && plan.assignments) || []) {
    if (item && item.roomId) used.add(String(item.roomId))
  }
  return used
}

// roomId -> the exams that have students assigned there.
export function roomBookings({ exams = [], plans = {} } = {}) {
  const bookings = new Map()
  for (const exam of exams) {
    for (const roomId of roomsUsedByPlan(plans[exam.id])) {
      if (!bookings.has(roomId)) bookings.set(roomId, [])
      bookings.get(roomId).push(exam)
    }
  }
  return bookings
}

// Rooms booked by two or more exams whose slots overlap.
export function doubleBookedRooms({ exams = [], plans = {} } = {}) {
  const clashes = []
  for (const [roomId, holders] of roomBookings({ exams, plans })) {
    const overlapping = []
    for (let i = 0; i < holders.length; i += 1) {
      for (let j = i + 1; j < holders.length; j += 1) {
        if (slotsOverlap(holders[i], holders[j])) {
          overlapping.push({ first: holders[i], second: holders[j] })
        }
      }
    }
    if (overlapping.length > 0) clashes.push({ roomId, exams: holders, overlapping })
  }
  return clashes
}

// Rooms the active exam must avoid, because an overlapping exam already has
// students sitting in them.
export function conflictingRoomIds({ exams = [], plans = {}, activeExamId = '' } = {}) {
  const active = exams.find((exam) => exam.id === activeExamId)
  const blocked = new Set()
  if (!active) return blocked
  for (const other of exams) {
    if (other.id === activeExamId) continue
    if (!slotsOverlap(active, other)) continue
    for (const roomId of roomsUsedByPlan(plans[other.id])) blocked.add(roomId)
  }
  return blocked
}

// Students sitting two exams whose slots overlap.
export function studentClashes({ exams = [] } = {}) {
  const byStudent = new Map()
  for (const exam of exams) {
    for (const id of exam.studentIds || []) {
      if (!byStudent.has(id)) byStudent.set(id, [])
      byStudent.get(id).push(exam)
    }
  }

  const clashes = []
  for (const [studentId, holders] of byStudent) {
    const pairs = []
    for (let i = 0; i < holders.length; i += 1) {
      for (let j = i + 1; j < holders.length; j += 1) {
        if (slotsOverlap(holders[i], holders[j])) {
          pairs.push({ first: holders[i], second: holders[j] })
        }
      }
    }
    if (pairs.length > 0) clashes.push({ studentId, exams: holders, pairs })
  }
  return clashes
}

export function nextExamId(exams = []) {
  const used = new Set((exams || []).map((exam) => String(exam && exam.id)))
  let n = 1
  while (used.has(`exam-${n}`)) n += 1
  return `exam-${n}`
}

/* ----------------------------- calendar --------------------------- */

export function toDateKey(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Always 6 weeks x 7 days (Sunday first) so the month never reflows.
export function buildMonthCalendar(year, month) {
  const first = new Date(year, month, 1)
  const offset = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const weeks = []

  for (let week = 0; week < 6; week += 1) {
    const row = []
    for (let day = 0; day < 7; day += 1) {
      const slot = week * 7 + day - offset
      let dateYear = year
      let dateMonth = month
      let dateDay = slot + 1
      let inMonth = true
      if (slot < 0) {
        dateMonth = month - 1
        dateDay = daysInPrev + slot + 1
        inMonth = false
      } else if (slot >= daysInMonth) {
        dateMonth = month + 1
        dateDay = slot - daysInMonth + 1
        inMonth = false
      }
      if (dateMonth < 0) {
        dateMonth = 11
        dateYear = year - 1
      } else if (dateMonth > 11) {
        dateMonth = 0
        dateYear = year + 1
      }
      row.push({ date: toDateKey(dateYear, dateMonth, dateDay), inMonth })
    }
    weeks.push(row)
  }
  return weeks
}

export function addMonths(year, month, delta) {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

// dateKey -> exams scheduled that day (exams with no date are left out).
export function examsByDate(exams = []) {
  const map = new Map()
  for (const exam of exams) {
    if (!exam.date) continue
    if (!map.has(exam.date)) map.set(exam.date, [])
    map.get(exam.date).push(exam)
  }
  return map
}