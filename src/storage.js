import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { nextExamId } from './exams.js'

/**
 * Single state module for the exam seat plan app.
 *
 * Owns the data model (Institution, Exam, Room, Student, Plan), versioned
 * localStorage persistence with a safe migration, JSON backup import/export,
 * and the React context the UI reads from. No backend: localStorage only.
 */

export const SCHEMA_VERSION = 2

const STATE_KEY = 'seatplan.state'
const LEGACY_ROOMS_KEY = 'seatplan.rooms'
const LEGACY_STUDENTS_KEY = 'seatplan.students'

const MAX_BACKUP_BYTES = 5 * 1024 * 1024
const MAX_LOGO_BYTES = 150 * 1024

/* ------------------------------------------------------------------ *
 * Sample data - used on first load and by "Reset sample data".
 * brokenSeats are 1-based [row, column] pairs, as the exam office uses.
 * ------------------------------------------------------------------ */

export const DEFAULT_ROOMS = [
  { id: 'room-a101', name: 'A-101', building: 'A', rows: 4, cols: 3, seatsPerBench: 3, brokenSeats: [] },
  { id: 'room-a102', name: 'A-102', building: 'A', rows: 3, cols: 3, seatsPerBench: 3, brokenSeats: [] },
  { id: 'room-a103', name: 'A-103', building: 'A', rows: 2, cols: 2, seatsPerBench: 2, brokenSeats: [[1, 2]] },
]

// The exam office list only gives id, name and course, so department and
// section are derived placeholders that can be edited later.
const STUDENT_ROWS = [
  ['241-15-1001', 'Rahim Uddin', 'CSE221', 'CSE'],
  ['241-15-1002', 'Nusrat Jahan', 'CSE221', 'CSE'],
  ['241-15-1003', 'Tanvir Ahmed', 'CSE221', 'CSE'],
  ['241-15-1004', 'Mim Akter', 'CSE221', 'CSE'],
  ['241-15-1005', 'Sabbir Hossain', 'CSE221', 'CSE'],
  ['241-15-1006', 'Farhana Islam', 'CSE221', 'CSE'],
  ['241-15-1007', 'Imran Khan', 'CSE221', 'CSE'],
  ['241-15-1008', 'Sadia Rahman', 'CSE221', 'CSE'],
  ['241-15-1009', 'Arif Mahmud', 'CSE221', 'CSE'],
  ['241-15-1010', 'Tasnim Akter', 'CSE221', 'CSE'],
  ['241-16-2001', 'Kamrul Hasan', 'MAT201', 'MAT'],
  ['241-16-2002', 'Lamia Sultana', 'MAT201', 'MAT'],
  ['241-16-2003', 'Nahid Hasan', 'MAT201', 'MAT'],
  ['241-16-2004', 'Priya Das', 'MAT201', 'MAT'],
  ['241-16-2005', 'Shakib Al Amin', 'MAT201', 'MAT'],
  ['241-16-2006', 'Mou Chowdhury', 'MAT201', 'MAT'],
  ['241-16-2007', 'Rafiq Islam', 'MAT201', 'MAT'],
  ['241-16-2008', 'Tuli Begum', 'MAT201', 'MAT'],
  ['241-16-2009', 'Fahim Reza', 'MAT201', 'MAT'],
  ['241-17-3001', 'Anika Tabassum', 'ENG101', 'ENG'],
  ['241-17-3002', 'Sourav Paul', 'ENG101', 'ENG'],
  ['241-17-3003', 'Habiba Khatun', 'ENG101', 'ENG'],
  ['241-17-3004', 'Zahid Hasan', 'ENG101', 'ENG'],
  ['241-17-3005', 'Ritu Parvin', 'ENG101', 'ENG'],
  ['241-17-3006', 'Mehedi Hasan', 'ENG101', 'ENG'],
  ['241-17-3007', 'Oishi Roy', 'ENG101', 'ENG'],
]

export const DEFAULT_STUDENTS = STUDENT_ROWS.map(([id, name, course, department]) => ({
  id,
  name,
  course,
  department,
  section: 'A',
}))

export const DEFAULT_INSTITUTION = {
  name: 'Example University',
  logo: null,
  language: 'en',
}

export const DEFAULT_EXAM = {
  id: 'exam-1',
  title: 'Mid Term Examination',
  date: '',
  startTime: '09:00',
  endTime: '12:00',
}

export const DEFAULT_EXAMS = [
  {
    id: 'exam-1',
    title: 'Mid Term Examination',
    date: '2026-05-12',
    startTime: '09:00',
    endTime: '12:00',
    studentIds: DEFAULT_STUDENTS.map((student) => student.id),
  },
  {
    id: 'exam-2',
    title: 'Practical Examination',
    date: '2026-05-12',
    startTime: '14:00',
    endTime: '17:00',
    studentIds: DEFAULT_STUDENTS.map((student) => student.id),
  },
]

// A Plan holds no seats of its own - just who sits where, who did not get
// a seat, the shuffle seed and the constraints that were applied.
export function createEmptyPlan(examId) {
  return {
    examId: examId ?? '',
    assignments: [],
    unseated: [],
    seed: 1,
    constraintsUsed: [],
  }
}

export function createDefaultState() {
  return {
    version: SCHEMA_VERSION,
    institution: clone(DEFAULT_INSTITUTION),
    rooms: clone(DEFAULT_ROOMS),
    students: clone(DEFAULT_STUDENTS),
    exams: clone(DEFAULT_EXAMS),
    plans: {},
    activeExamId: DEFAULT_EXAMS[0].id,
  }
}

/* ----------------------------- helpers ----------------------------- */

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function toInt(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function text(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function slugify(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/* --------------------------- normalization -------------------------- */

function normalizeInstitution(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const logo =
    typeof source.logo === 'string' && source.logo.startsWith('data:image/')
      ? source.logo
      : null
  return {
    name: text(source.name) || DEFAULT_INSTITUTION.name,
    logo,
    language: source.language === 'bn' ? 'bn' : 'en',
  }
}

function normalizeExam(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const studentIds = Array.isArray(source.studentIds)
    ? Array.from(new Set(source.studentIds.map(text).filter(Boolean)))
    : []
  return {
    id: text(source.id) || DEFAULT_EXAM.id,
    title: text(source.title) || DEFAULT_EXAM.title,
    date: text(source.date),
    startTime: text(source.startTime) || DEFAULT_EXAM.startTime,
    endTime: text(source.endTime) || DEFAULT_EXAM.endTime,
    studentIds,
  }
}

// Broken seats are stored 1-based and de-duplicated, so a seat is never
// subtracted from capacity twice and entries outside the grid are dropped.
function normalizeBrokenSeats(raw, rows, cols) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const seats = []
  for (const entry of raw) {
    let row, col
    if (Array.isArray(entry)) {
      row = entry[0]
      col = entry[1]
    } else if (entry && typeof entry === 'object') {
      row = entry.row
      col = entry.col
    } else {
      continue
    }
    row = toInt(row, 0)
    col = toInt(col, 0)
    if (row < 1 || row > rows || col < 1 || col > cols) continue
    const key = `${row},${col}`
    if (seen.has(key)) continue
    seen.add(key)
    seats.push([row, col])
  }
  return seats
}

function normalizeRoom(raw, index) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const rows = clamp(toInt(source.rows, 1), 1, 50)
  const cols = clamp(toInt(source.cols, 1), 1, 50)
  const name = text(source.name) || `Room ${index + 1}`
  return {
    id: text(source.id) || slugify(name) || `room-${index + 1}`,
    name,
    building: text(source.building),
    rows,
    cols,
    seatsPerBench: clamp(toInt(text(source.seatsPerBench) || cols, cols), 1, cols),
    // "broken" is the old field name, kept so legacy data migrates cleanly.
    brokenSeats: normalizeBrokenSeats(source.brokenSeats ?? source.broken, rows, cols),
  }
}

function normalizeStudent(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    id: text(source.id),
    name: text(source.name),
    course: text(source.course),
    department: text(source.department),
    section: text(source.section),
  }
}

function normalizePlan(raw, examId) {
  if (!raw || typeof raw !== 'object') return null
  const assignments = Array.isArray(raw.assignments)
    ? raw.assignments
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          studentId: text(item.studentId),
          roomId: text(item.roomId),
          roomName: text(item.roomName),
          row: toInt(item.row, 0),
          col: toInt(item.col, 0),
        }))
        .filter((item) => item.studentId)
    : []
  return {
    examId: text(raw.examId) || text(examId),
    assignments,
    unseated: Array.isArray(raw.unseated)
      ? raw.unseated.map(text).filter(Boolean)
      : [],
    seed: Math.max(1, toInt(raw.seed, 1)),
    constraintsUsed: Array.isArray(raw.constraintsUsed)
      ? raw.constraintsUsed.map(text).filter(Boolean)
      : [],
  }
}

// Room ids must be unique: the seating grid and search both key on them.
function withUniqueIds(rooms) {
  const used = new Set()
  return rooms.map((room, index) => {
    let id = room.id || `room-${index + 1}`
    while (used.has(id)) id = `${id}-${index + 1}`
    used.add(id)
    return { ...room, id }
  })
}

function withUniqueExamIds(exams) {
  const used = new Set()
  return exams.map((exam, index) => {
    let id = exam.id || `exam-${index + 1}`
    while (used.has(id)) id = `${id}-${index + 1}`
    used.add(id)
    return { ...exam, id }
  })
}

function normalizeState(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const rooms = withUniqueIds(
    (Array.isArray(source.rooms) ? source.rooms : []).map(normalizeRoom),
  )
  const students = (Array.isArray(source.students) ? source.students : [])
    .map(normalizeStudent)
    .filter((student) => student.id)

  const known = new Set(students.map((student) => student.id))
  const exams = withUniqueExamIds(
    (Array.isArray(source.exams) ? source.exams : []).map(normalizeExam),
  )
  // Drop roster entries for students that are no longer in the catalogue.
  for (const exam of exams) {
    exam.studentIds = exam.studentIds.filter((id) => known.has(id))
  }

  // Plans live in a map keyed by exam id, and only for exams that still exist.
  const stored =
    source.plans && typeof source.plans === 'object' && !Array.isArray(source.plans)
      ? source.plans
      : {}
  const plans = {}
  for (const exam of exams) {
    const plan = normalizePlan(stored[exam.id], exam.id)
    if (plan) plans[exam.id] = plan
  }

  const wanted = text(source.activeExamId)
  const activeExamId = exams.some((exam) => exam.id === wanted)
    ? wanted
    : exams.length > 0
      ? exams[0].id
      : ''

  return {
    version: SCHEMA_VERSION,
    institution: normalizeInstitution(source.institution),
    rooms,
    students,
    exams,
    plans,
    activeExamId,
  }
}

/* ---------------------------- migration ---------------------------- */

// v0 was the first draft of this app: rooms and students lived in two
// separate localStorage keys and rooms used "broken" instead of "brokenSeats".
function upgradeV0toV1(source) {
  return {
    institution: source.institution,
    exam: source.exam,
    rooms: source.rooms,
    students: source.students,
    plan: source.plan,
  }
}

// v1 had one `exam`, one flat `students` list and one `plan`. v2 keeps the same
// student records but lets each exam carry its own roster and its own plan.
function upgradeV1toV2(source) {
  const single = source.exam
  if (!single || typeof single !== 'object') {
    // No exam in the old data, but the rooms and students must survive.
    return {
      institution: source.institution,
      rooms: source.rooms,
      students: source.students,
      exams: [],
      plans: {},
      activeExamId: '',
    }
  }
  const id = text(single.id) || 'exam-1'
  const studentIds = (Array.isArray(source.students) ? source.students : [])
    .map((student) => text(student && student.id))
    .filter(Boolean)
  return {
    institution: source.institution,
    rooms: source.rooms,
    students: source.students,
    exams: [{ ...single, studentIds }],
    plans:
      source.plan && typeof source.plan === 'object' ? { [id]: source.plan } : {},
    activeExamId: id,
  }
}

export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('bad-json')
  }
  const version = Number.isFinite(Number(raw.version)) ? Number(raw.version) : 0
  if (version > SCHEMA_VERSION) {
    throw new Error('bad-version')
  }
  if (version < 2) {
    const v1 = version === 0 ? upgradeV0toV1(raw) : raw
    return normalizeState(upgradeV1toV2(v1))
  }
  return normalizeState(raw)
}

/* --------------------------- persistence --------------------------- */

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, version: SCHEMA_VERSION }))
    return true
  } catch {
    return false
  }
}

export function loadState() {
  const saved = readJSON(STATE_KEY)
  if (saved) {
    try {
      return migrate(saved)
    } catch {
      // unreadable or from a newer build - fall through and reseed
    }
  }

  // Pick up data written by the previous (v0) version of the app.
  const legacyRooms = readJSON(LEGACY_ROOMS_KEY)
  const legacyStudents = readJSON(LEGACY_STUDENTS_KEY)
  if (legacyRooms || legacyStudents) {
    try {
      const migrated = migrate({ version: 0, rooms: legacyRooms, students: legacyStudents })
      saveState(migrated)
      return migrated
    } catch {
      // ignore and seed below
    }
  }

  const seeded = createDefaultState()
  saveState(seeded)
  return seeded
}

/* ----------------------------- backup ------------------------------ */

export function backupPayload(state) {
  return {
    ...state,
    app: 'exam-seat-plan',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
  }
}

export function downloadBackup(state) {
  const json = JSON.stringify(backupPayload(state), null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `seatplan-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file) {
  if (!file) return { ok: false, error: 'read' }
  if (file.size > MAX_BACKUP_BYTES) return { ok: false, error: 'too-large' }
  let parsed
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    return { ok: false, error: 'bad-json' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'not-object' }
  }
  try {
    return { ok: true, state: migrate(parsed) }
  } catch (error) {
    return { ok: false, error: error.message === 'bad-version' ? 'bad-version' : 'bad-json' }
  }
}

/* ----------------------------- assets ------------------------------ */

export function readImageAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve({ ok: false, error: 'not-image' })
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      resolve({ ok: false, error: 'too-large' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ ok: true, dataUrl: String(reader.result) })
    reader.onerror = () => resolve({ ok: false, error: 'read' })
    reader.readAsDataURL(file)
  })
}

/* ---------------------------- capacity ----------------------------- */

export function roomCapacity(room) {
  return Math.max(0, room.rows * room.cols - room.brokenSeats.length)
}

export function totalCapacity(rooms) {
  return rooms.reduce((sum, room) => sum + roomCapacity(room), 0)
}

/* ----------------------- React state module ------------------------ */

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  // Every setter re-normalizes, so the model stays valid however it is edited.
  const setInstitution = useCallback(
    (changes) =>
      setState((current) => ({
        ...current,
        institution: normalizeInstitution({ ...current.institution, ...changes }),
      })),
    [],
  )
  const setActiveExam = useCallback(
    (id) => setState((current) => ({ ...current, activeExamId: id })),
    [],
  )
  const updateExam = useCallback(
    (changes) =>
      setState((current) => ({
        ...current,
        exams: current.exams.map((exam) =>
          exam.id === current.activeExamId
            ? normalizeExam({ ...exam, ...changes })
            : exam,
        ),
      })),
    [],
  )
  const setExamStudentIds = useCallback(
    (ids) => updateExam({ studentIds: Array.from(new Set(ids || [])) }),
    [updateExam],
  )
  const addExam = useCallback(
    (exam) =>
      setState((current) => {
        const created = normalizeExam({
          ...(exam || {}),
          id: nextExamId(current.exams),
        })
        return {
          ...current,
          exams: [...current.exams, created],
          activeExamId: created.id,
        }
      }),
    [],
  )
  const duplicateExam = useCallback(
    (id) =>
      setState((current) => {
        const source = current.exams.find((exam) => exam.id === id)
        if (!source) return current
        // A copy keeps the same slot and roster but starts with no plan.
        const copy = normalizeExam({ ...source, id: nextExamId(current.exams) })
        return {
          ...current,
          exams: [...current.exams, copy],
          activeExamId: copy.id,
        }
      }),
    [],
  )
  const deleteExam = useCallback(
    (id) =>
      setState((current) => {
        const exams = current.exams.filter((exam) => exam.id !== id)
        const plans = { ...current.plans }
        delete plans[id]
        return {
          ...current,
          exams,
          plans,
          activeExamId:
            current.activeExamId === id
              ? exams.length > 0
                ? exams[0].id
                : ''
              : current.activeExamId,
        }
      }),
    [],
  )
  const setRooms = useCallback(
    (rooms) =>
      setState((current) => ({
        ...current,
        rooms: withUniqueIds((rooms || []).map(normalizeRoom)),
      })),
    [],
  )
  const setStudents = useCallback(
    (students) =>
      setState((current) => {
        const next = (students || [])
          .map(normalizeStudent)
          .filter((student) => student.id)
        const known = new Set(next.map((student) => student.id))
        // Keep every exam roster pointing at students that still exist.
        return {
          ...current,
          students: next,
          exams: current.exams.map((exam) => ({
            ...exam,
            studentIds: exam.studentIds.filter((id) => known.has(id)),
          })),
        }
      }),
    [],
  )
  const setPlan = useCallback(
    (plan) =>
      setState((current) => {
        if (!current.activeExamId) return current
        const normalized = normalizePlan(plan, current.activeExamId)
        if (!normalized) return current
        return {
          ...current,
          plans: { ...current.plans, [current.activeExamId]: normalized },
        }
      }),
    [],
  )
  // Used by "Import backup" to swap the whole model in one go.
  const replaceState = useCallback((next) => setState(normalizeState(next)), [])
  const resetData = useCallback(() => setState(createDefaultState()), [])

  const activeExamId = state.activeExamId
  const exam =
    state.exams.find((item) => item.id === activeExamId) || null
  const examStudents = useMemo(() => {
    const roster = new Set(exam ? exam.studentIds : [])
    return state.students.filter((student) => roster.has(student.id))
  }, [exam, state.students])

  const value = {
    state,
    institution: state.institution,
    rooms: state.rooms,
    students: state.students,
    exams: state.exams,
    activeExamId,
    exam,
    examStudents,
    plans: state.plans,
    plan: state.plans[activeExamId] || null,
    setInstitution,
    setRooms,
    setStudents,
    setActiveExam,
    updateExam,
    setExamStudentIds,
    addExam,
    duplicateExam,
    deleteExam,
    setPlan,
    replaceState,
    resetData,
  }

  return createElement(DataContext.Provider, { value }, children)
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used inside <DataProvider>')
  }
  return context
}