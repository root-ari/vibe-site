/**
 * Pure seat-assignment logic. No React, no DOM, no storage - everything here
 * is a deterministic function of its inputs, so the same seed always produces
 * the same plan.
 */

export const CONSTRAINTS = {
  courseSide: 'course-side',
  courseFrontBack: 'course-frontback',
  department: 'department',
}

export const DEFAULT_OPTIONS = {
  noSameCourseSideBySide: true,
  noSameCourseFrontBack: false,
  noSameDepartment: false,
  skipAlternateBenches: false,
  skipAlternateColumns: false,
  order: 'roll',
  seed: 1,
  maxRetries: 25,
  excludeStudentIds: [],
  frontSeatStudentIds: [],
}

/* ---------------------------- utilities --------------------------- */

function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(Math.trunc(number), min), max)
}

// Blank course/department values never count as "the same".
function sameValue(a, b) {
  return Boolean(a) && Boolean(b) && a === b
}

function compareIds(a, b) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

// Deterministic PRNG - the only source of randomness in this module.
function mulberry32(seed) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWith(list, seed) {
  const random = mulberry32(seed)
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

// An unset key falls back to the default, but an explicit false still turns a
// rule off - that is what the UI toggles rely on.
export function normalizeOptions(raw = {}) {
  const flag = (key) =>
    typeof raw[key] === 'boolean' ? raw[key] : DEFAULT_OPTIONS[key]
  return {
    noSameCourseSideBySide: flag('noSameCourseSideBySide'),
    noSameCourseFrontBack: flag('noSameCourseFrontBack'),
    noSameDepartment: flag('noSameDepartment'),
    skipAlternateBenches: flag('skipAlternateBenches'),
    skipAlternateColumns: flag('skipAlternateColumns'),
    order: raw.order === 'shuffle' ? 'shuffle' : DEFAULT_OPTIONS.order,
    seed: clampInt(raw.seed, 1, 999999, DEFAULT_OPTIONS.seed),
    maxRetries: clampInt(raw.maxRetries, 0, 200, DEFAULT_OPTIONS.maxRetries),
    excludeStudentIds: idList(raw.excludeStudentIds),
    frontSeatStudentIds: idList(raw.frontSeatStudentIds),
  }
}

function idList(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => String(item)).filter(Boolean)))
}

export function constraintsUsed(options) {
  const opts = normalizeOptions(options)
  const used = []
  if (opts.noSameCourseSideBySide) used.push(CONSTRAINTS.courseSide)
  if (opts.noSameCourseFrontBack) used.push(CONSTRAINTS.courseFrontBack)
  if (opts.noSameDepartment) used.push(CONSTRAINTS.department)
  if (opts.skipAlternateBenches) used.push('skip-bench')
  if (opts.skipAlternateColumns) used.push('skip-column')
  return used
}

/* ------------------------------- grid ---------------------------- */

export function buildRoomGrid(room, options = {}) {
  const opts = normalizeOptions(options)
  const rows = Math.max(1, Math.trunc(Number(room.rows) || 1))
  const cols = Math.max(1, Math.trunc(Number(room.cols) || 1))
  const seatsPerBench = Math.max(1, Math.min(Math.trunc(Number(room.seatsPerBench) || cols), cols))
  // brokenSeats are stored 1-based, so compare without converting the index.
  const broken = new Set(
    (room.brokenSeats || []).map((seat) => `${Number(seat[0])},${Number(seat[1])}`),
  )

  const cells = []
  for (let row = 1; row <= rows; row += 1) {
    const line = []
    for (let col = 1; col <= cols; col += 1) {
      const bench = Math.floor((col - 1) / seatsPerBench)
      let blockedBy = null
      if (broken.has(`${row},${col}`)) blockedBy = 'broken'
      else if (opts.skipAlternateColumns && col % 2 === 0) blockedBy = 'skip-column'
      else if (opts.skipAlternateBenches && bench % 2 === 1) blockedBy = 'skip-bench'
      line.push({ row, col, bench, blocked: Boolean(blockedBy), blockedBy, studentId: null })
    }
    cells.push(line)
  }

  return {
    roomId: room.id,
    name: room.name,
    building: room.building || '',
    rows,
    cols,
    seatsPerBench,
    capacity: cells.flat().filter((cell) => !cell.blocked).length,
    cells,
  }
}

function studentIndex(students) {
  const map = new Map()
  for (const student of students) map.set(String(student.id), student)
  return map
}

function cellAt(grid, row, col) {
  if (row < 1 || row > grid.rows || col < 1 || col > grid.cols) return null
  return grid.cells[row - 1][col - 1]
}

// Every enabled rule this student would break if seated at `cell`.
function conflictsFor(student, cell, grid, options, byId) {
  const conflicts = []
  const around = [
    ['left', cellAt(grid, cell.row, cell.col - 1), 'horizontal'],
    ['right', cellAt(grid, cell.row, cell.col + 1), 'horizontal'],
    ['front', cellAt(grid, cell.row - 1, cell.col), 'vertical'],
    ['back', cellAt(grid, cell.row + 1, cell.col), 'vertical'],
  ]

  for (const [direction, other, axis] of around) {
    if (!other || other.blocked || !other.studentId) continue
    const neighbour = byId.get(other.studentId)
    if (!neighbour) continue
    if (
      axis === 'horizontal' &&
      options.noSameCourseSideBySide &&
      sameValue(student.course, neighbour.course)
    ) {
      conflicts.push({ constraint: CONSTRAINTS.courseSide, direction, withStudentId: other.studentId })
    }
    if (
      axis === 'vertical' &&
      options.noSameCourseFrontBack &&
      sameValue(student.course, neighbour.course)
    ) {
      conflicts.push({ constraint: CONSTRAINTS.courseFrontBack, direction, withStudentId: other.studentId })
    }
    if (
      options.noSameDepartment &&
      sameValue(student.department, neighbour.department)
    ) {
      conflicts.push({ constraint: CONSTRAINTS.department, direction, withStudentId: other.studentId })
    }
  }
  return conflicts
}

/* ---------------------------- ordering --------------------------- */

function orderStudents(students, options, attempt) {
  const sorted = students.slice().sort((a, b) => compareIds(String(a.id), String(b.id)))

  if (options.order === 'shuffle') return shuffleWith(sorted, options.seed + attempt)
  if (attempt === 0) return sorted

  // Retries keep roll order inside each course but shuffle the course groups,
  // which escapes a bad first guess without losing ID order inside a course.
  const groups = new Map()
  for (const student of sorted) {
    const key = student.course || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(student)
  }
  const out = []
  for (const key of shuffleWith(Array.from(groups.keys()), options.seed + attempt)) {
    out.push(...groups.get(key))
  }
  return out
}

/* --------------------------- evaluation -------------------------- */

// Visits each adjacent pair exactly once (right + back), so `checks` is a
// stable denominator for the score and no pair is counted twice.
export function evaluateGrids(grids, options, byId) {
  const violations = []
  let checks = 0

  for (const grid of grids) {
    for (let row = 1; row <= grid.rows; row += 1) {
      for (let col = 1; col <= grid.cols; col += 1) {
        const cell = grid.cells[row - 1][col - 1]
        if (cell.blocked || !cell.studentId) continue

        for (const [direction, other] of [
          ['right', cellAt(grid, row, col + 1)],
          ['back', cellAt(grid, row + 1, col)],
        ]) {
          if (!other || other.blocked || !other.studentId) continue
          const a = byId.get(cell.studentId)
          const b = byId.get(other.studentId)
          if (!a || !b) continue

          const horizontal = direction === 'right'
          const rules = []
          if (horizontal && options.noSameCourseSideBySide) {
            rules.push([CONSTRAINTS.courseSide, sameValue(a.course, b.course)])
          }
          if (!horizontal && options.noSameCourseFrontBack) {
            rules.push([CONSTRAINTS.courseFrontBack, sameValue(a.course, b.course)])
          }
          if (options.noSameDepartment) {
            rules.push([CONSTRAINTS.department, sameValue(a.department, b.department)])
          }

          for (const [constraint, broken] of rules) {
            checks += 1
            if (!broken) continue
            violations.push({
              constraint,
              direction,
              roomId: grid.roomId,
              roomName: grid.name,
              row: cell.row,
              col: cell.col,
              studentId: cell.studentId,
              studentName: a.name,
              withStudentId: other.studentId,
              withStudentName: b.name,
            })
          }
        }
      }
    }
  }

  return { checks, violations }
}

export function scoreOf(checks, violationCount) {
  if (checks <= 0) return 100
  return Math.round(((checks - violationCount) / checks) * 100)
}

function eligibleStudents(students, options) {
  const excluded = new Set(options.excludeStudentIds)
  return students.filter((student) => !excluded.has(String(student.id)))
}

function runAttempt(rooms, students, options, attempt) {
  const grids = rooms.map((room) => buildRoomGrid(room, options))
  const byId = studentIndex(students)
  // Absent students never get a seat and are not reported as unseated.
  const remaining = orderStudents(eligibleStudents(students, options), options, attempt)

  // Students who need a front seat are placed in row 1 before anyone else.
  const frontSeat = new Set(options.frontSeatStudentIds)
  if (frontSeat.size > 0) {
    for (const grid of grids) {
      for (let col = 1; col <= grid.cols; col += 1) {
        const cell = grid.cells[0][col - 1]
        if (cell.blocked || remaining.length === 0) continue
        const index = remaining.findIndex((student) =>
          frontSeat.has(String(student.id)),
        )
        if (index < 0) break
        cell.studentId = String(remaining[index].id)
        remaining.splice(index, 1)
      }
    }
  }

  for (const grid of grids) {
    for (let row = 1; row <= grid.rows; row += 1) {
      for (let col = 1; col <= grid.cols; col += 1) {
        const cell = grid.cells[row - 1][col - 1]
        // skip blocked seats and anything already taken by a front-seat student
        if (cell.blocked || cell.studentId || remaining.length === 0) continue

        // Greedy: take the first student with no conflict, otherwise the one
        // that breaks the fewest rules, so a seat is never left empty.
        let bestIndex = -1
        let bestConflicts = Infinity
        for (let i = 0; i < remaining.length; i += 1) {
          const count = conflictsFor(remaining[i], cell, grid, options, byId).length
          if (count < bestConflicts) {
            bestConflicts = count
            bestIndex = i
            if (count === 0) break
          }
        }
        if (bestIndex < 0) continue
        cell.studentId = String(remaining.splice(bestIndex, 1)[0].id)
      }
    }
  }

  const evaluation = evaluateGrids(grids, options, byId)
  return {
    grids,
    unseated: remaining.map((student) => String(student.id)),
    checks: evaluation.checks,
    violations: evaluation.violations,
  }
}

function toAssignments(grids) {
  const assignments = []
  for (const grid of grids) {
    for (const line of grid.cells) {
      for (const cell of line) {
        if (!cell.studentId) continue
        assignments.push({
          studentId: cell.studentId,
          roomId: grid.roomId,
          roomName: grid.name,
          row: cell.row,
          col: cell.col,
        })
      }
    }
  }
  return assignments
}

function summarizeRooms(grids, byId) {
  return grids.map((grid) => {
    const seated = grid.cells.flat().filter((cell) => !cell.blocked && cell.studentId).length
    return {
      roomId: grid.roomId,
      name: grid.name,
      building: grid.building,
      rows: grid.rows,
      cols: grid.cols,
      seatsPerBench: grid.seatsPerBench,
      capacity: grid.capacity,
      seated,
      utilization: grid.capacity ? Math.round((seated / grid.capacity) * 100) : 0,
      cells: grid.cells.map((line) =>
        line.map((cell) => ({
          ...cell,
          student: cell.studentId ? byId.get(cell.studentId) || null : null,
        })),
      ),
    }
  })
}

function shapeOf({ examId, opts, grids, byId, eligible, unseated, checks, violations, attempts }) {
  const assignments = toAssignments(grids)
  return {
    plan: {
      examId: examId || '',
      assignments,
      unseated,
      seed: opts.seed,
      constraintsUsed: constraintsUsed(opts),
    },
    options: opts,
    rooms: summarizeRooms(grids, byId),
    violations,
    score: {
      score: scoreOf(checks, violations.length),
      checks,
      satisfied: checks - violations.length,
      attempts,
    },
    totals: {
      students: eligible ? eligible.length : byId.size,
      absent: opts.excludeStudentIds.length,
      capacity: grids.reduce((sum, grid) => sum + grid.capacity, 0),
      seated: assignments.length,
      unseated: unseated.length,
    },
  }
}

/**
 * Greedy placement with randomized retries. Every attempt is deterministic
 * for a given seed, and the best scoring attempt always wins.
 */
export function generatePlan({ rooms = [], students = [], examId = '', options = {} } = {}) {
  const opts = normalizeOptions(options)
  const byId = studentIndex(students)
  let best = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt += 1) {
    const result = runAttempt(rooms, students, opts, attempt)
    const score = scoreOf(result.checks, result.violations.length)
    const better =
      !best ||
      score > best.score ||
      (score === best.score && result.violations.length < best.violations.length)
    if (better) best = { ...result, score, attempt }
    if (score === 100) break // nothing left to improve
  }

  return shapeOf({
    examId,
    opts,
    grids: best.grids,
    byId,
    eligible: eligibleStudents(students, opts),
    unseated: best.unseated,
    checks: best.checks,
    violations: best.violations,
    attempts: best.attempt + 1,
  })
}

// Rebuild the display data from a stored plan without re-running the search.
export function hydratePlan(plan, rooms, students, options = {}) {
  if (!plan) return null
  const opts = normalizeOptions(options)
  const byId = studentIndex(students)
  const grids = rooms.map((room) => buildRoomGrid(room, opts))
  const byRoom = new Map(grids.map((grid) => [grid.roomId, grid]))

  for (const item of plan.assignments || []) {
    const grid = byRoom.get(String(item.roomId))
    if (!grid) continue
    const cell = cellAt(grid, Number(item.row), Number(item.col))
    if (!cell || cell.blocked) continue
    cell.studentId = String(item.studentId)
  }

  const evaluation = evaluateGrids(grids, opts, byId)
  const seated = new Set(grids.flat().map((cell) => cell.studentId).filter(Boolean))
  const unseated = (plan.unseated || []).filter((id) => !seated.has(String(id)))

  return shapeOf({
    examId: plan.examId,
    opts,
    grids,
    byId,
    eligible: eligibleStudents(students, opts),
    unseated,
    checks: evaluation.checks,
    violations: evaluation.violations,
    attempts: 0,
  })
}