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
import { normalizeInvigilator, uniqueInvigilators } from './invigilators.js'
import { storedLang, translations } from './i18n.js'
import {
  MAX_ASSIGNMENTS,
  MAX_EXAMS,
  MAX_ID,
  MAX_ROOMS,
  MAX_STUDENTS,
  MAX_TEXT,
  cleanText,
  safeArray,
  safeJsonParse,
  safeKey,
} from './security.js'

/**
 * Single state module for the exam seat plan app.
 *
 * Owns the data model (Institution, Exam, Room, Student, Plan), versioned
 * localStorage persistence with a safe migration, JSON backup import/export,
 * and the React context the UI reads from. No backend: localStorage only.
 */

export const SCHEMA_VERSION = 4

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

// Sample names are seeded in whichever language is already selected, so the
// first screen is never English for a Bangla user.
function sampleText() {
  return translations[storedLang()] || translations.en
}

export function defaultInstitution() {
  return { name: sampleText()['sample.institution'], logo: null, language: storedLang() }
}

export const DEFAULT_INVIGILATORS = [
  { id: 'inv-1', name: 'Dr. Shirin Akter', phone: '', department: 'CSE' },
  { id: 'inv-2', name: 'Md. Robiul Islam', phone: '', department: 'MAT' },
  { id: 'inv-3', name: 'Farhana Kabir', phone: '', department: 'ENG' },
  { id: 'inv-4', name: 'Jamal Uddin', phone: '', department: 'CSE' },
]

// Everything the exam office edits by hand about the seating of one exam.
export function createDefaultSeating() {
  return {
    lockedSeats: [],
    absentIds: [],
    specialNeedsIds: [],
    invigilatorsPerRoom: 1,
    invigilatorAssignments: {},
  }
}

export function defaultExams() {
  const text = sampleText()
  return [
    {
      id: 'exam-1',
      title: text['sample.examMid'],
      date: '2026-05-12',
      startTime: '09:00',
      endTime: '12:00',
      studentIds: DEFAULT_STUDENTS.map((student) => student.id),
      seating: createDefaultSeating(),
    },
    {
      id: 'exam-2',
      title: text['sample.examPractical'],
      date: '2026-05-12',
      startTime: '14:00',
      endTime: '17:00',
      studentIds: DEFAULT_STUDENTS.map((student) => student.id),
      seating: createDefaultSeating(),
    },
  ]
}

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
  const exams = defaultExams()
  return {
    version: SCHEMA_VERSION,
    institution: defaultInstitution(),
    rooms: clone(DEFAULT_ROOMS),
    students: clone(DEFAULT_STUDENTS),
    exams,
    invigilators: clone(DEFAULT_INVIGILATORS),
    plans: {},
    activeExamId: exams[0].id,
    // A brand new browser gets the guided setup; existing data does not.
    onboarded: false,
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

// Every value that came from a file or from localStorage passes through here.
// `text` is the single choke point, so no untrusted string reaches the UI, the
// print documents or a lookup map without being bounded first.
//
// Both helpers take exactly ONE argument on purpose: they are used as
// `array.map(text)` in several places, and a second parameter would receive the
// array index and be mistaken for a length limit.
function text(value) {
  return cleanText(value, MAX_TEXT)
}

// Identifiers get a tighter cap.
function id(value) {
  return cleanText(value, MAX_ID)
}

function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(Math.trunc(number), min), max)
}

function slugify(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/* --------------------------- normalization -------------------------- */

function normalizeInstitution(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  // A logo is an inline data URL, so it is capped well below the file limit and
  // must really be an image before it can reach an <img src>.
  const logo =
    typeof source.logo === 'string' &&
    source.logo.startsWith('data:image/') &&
    /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]*$/.test(source.logo) &&
    source.logo.length <= MAX_LOGO_BYTES * 2
      ? source.logo
      : null
  return {
    name: text(source.name),
    logo,
    language: source.language === 'bn' ? 'bn' : 'en',
  }
}

function normalizeSeating(raw) {
  const base = createDefaultSeating()
  const source = raw && typeof raw === 'object' ? raw : {}
  const list = (value) =>
    Array.isArray(value)
      ? Array.from(new Set(value.map(text).filter(Boolean)))
      : []

  const assignments = {}
  const rawAssignments =
    source.invigilatorAssignments &&
    typeof source.invigilatorAssignments === 'object' &&
    !Array.isArray(source.invigilatorAssignments)
      ? source.invigilatorAssignments
      : {}
  for (const [roomId, value] of Object.entries(rawAssignments)) {
    // safeKey drops __proto__/constructor/prototype instead of writing them.
    const key = safeKey(roomId)
    if (!key) continue
    const ids = list(value)
    if (ids.length > 0) assignments[key] = ids
  }

  return {
    lockedSeats: list(source.lockedSeats),
    absentIds: list(source.absentIds),
    specialNeedsIds: list(source.specialNeedsIds),
    invigilatorsPerRoom: clampInt(
      text(source.invigilatorsPerRoom) || base.invigilatorsPerRoom,
      0,
      10,
      base.invigilatorsPerRoom,
    ),
    invigilatorAssignments: assignments,
  }
}

export function normalizeExam(raw, index) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const studentIds = Array.isArray(source.studentIds)
    ? Array.from(new Set(source.studentIds.map(text).filter(Boolean)))
    : []
  return {
    id: text(source.id) || `exam-${index + 1}`,
    title: text(source.title),
    date: text(source.date),
    startTime: text(source.startTime),
    endTime: text(source.endTime),
    studentIds,
    seating: normalizeSeating(source.seating),
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
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const rows = clamp(toInt(source.rows, 1), 1, 50)
  const cols = clamp(toInt(source.cols, 1), 1, 50)
  // No invented English name: the UI shows a translated placeholder instead.
  const name = text(source.name)
  return {
    id: id(source.id) || slugify(name) || `room-${index + 1}`,
    name,
    building: text(source.building),
    rows,
    cols,
    seatsPerBench: clamp(toInt(text(source.seatsPerBench) || cols, cols), 1, cols),
    // "broken" is the old field name, kept so legacy data migrates cleanly.
    brokenSeats: normalizeBrokenSeats(
      safeArray(source.brokenSeats ?? source.broken, 2500),
      rows,
      cols,
    ),
  }
}

function normalizeStudent(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return {
    id: id(source.id),
    name: text(source.name),
    course: text(source.course),
    department: text(source.department),
    section: text(source.section),
  }
}

function normalizePlan(raw, examId) {
  if (!raw || typeof raw !== 'object') return null
  const assignments = Array.isArray(raw.assignments)
    ? safeArray(raw.assignments, MAX_ASSIGNMENTS)
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({
          studentId: id(item.studentId),
          roomId: id(item.roomId),
          roomName: text(item.roomName),
          row: toInt(item.row, 0),
          col: toInt(item.col, 0),
        }))
        .filter((item) => item.studentId)
    : []
  return {
    examId: id(raw.examId) || id(examId),
    assignments,
    unseated: safeArray(raw.unseated, MAX_STUDENTS).map((value) => id(value)).filter(Boolean),
    seed: Math.max(1, toInt(raw.seed, 1)),
    constraintsUsed: safeArray(raw.constraintsUsed, 16)
      .map((value) => text(value))
      .filter(Boolean),
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
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  // Collection sizes are capped so a crafted file or a bloated localStorage
  // value cannot exhaust memory on load.
  const rooms = withUniqueIds(
    safeArray(source.rooms, MAX_ROOMS).map(normalizeRoom),
  )
  const students = safeArray(source.students, MAX_STUDENTS)
    .map(normalizeStudent)
    .filter((student) => student.id)

  const invigilators = uniqueInvigilators(
    safeArray(source.invigilators, MAX_ROOMS).map(normalizeInvigilator),
  )
  const invigilatorIds = new Set(invigilators.map((item) => item.id))
  const roomIds = new Set(rooms.map((room) => room.id))

  const known = new Set(students.map((student) => student.id))
  const exams = withUniqueExamIds(
    safeArray(source.exams, MAX_EXAMS).map(normalizeExam),
  )
  // Drop roster entries for students that are no longer in the catalogue, and
  // prune seating flags that point at rooms, people or students that are gone.
  for (const [index, exam] of exams.entries()) {
    // The exam id is used as a key into the plans map.
    const examKey = safeKey(exam.id) || `exam-${index + 1}`
    exam.id = examKey
    exam.studentIds = exam.studentIds.filter((value) => known.has(value))
    const roster = new Set(exam.studentIds)
    exam.seating.absentIds = exam.seating.absentIds.filter((value) => roster.has(value))
    exam.seating.specialNeedsIds = exam.seating.specialNeedsIds.filter((value) =>
      roster.has(value),
    )
    exam.seating.lockedSeats = exam.seating.lockedSeats.filter((value) =>
      roomIds.has(String(value).split(':')[0]),
    )
    const assignments = {}
    for (const [roomId, list] of Object.entries(exam.seating.invigilatorAssignments)) {
      if (!roomIds.has(roomId)) continue
      const kept = Array.from(new Set(list)).filter((value) => invigilatorIds.has(value))
      if (kept.length > 0) assignments[safeKey(roomId) || roomId] = kept
    }
    exam.seating.invigilatorAssignments = assignments
  }

  // Plans live in a map keyed by exam id, and only for exams that still exist.
  const stored =
    source.plans && typeof source.plans === 'object' && !Array.isArray(source.plans)
      ? source.plans
      : {}
  const plans = {}
  for (const exam of exams) {
    const key = safeKey(exam.id)
    if (!key) continue
    const plan = normalizePlan(stored[key], key)
    if (plan) plans[key] = plan
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
    invigilators,
    plans,
    activeExamId,
    // Only a fresh install opts in; anything older counts as already set up.
    onboarded: source.onboarded !== false,
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

/** Marker returned when a stored value exists but cannot be parsed. */
const CORRUPT = Symbol('corrupt')

export function isCorrupt(value) {
  return value === CORRUPT
}

// localStorage is treated as UNTRUSTED input: it can be edited by hand, left
// behind by an older build, or corrupted. Parsing goes through safeJsonParse so
// prototype-polluting keys are dropped before anything touches the state.
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = safeJsonParse(raw, undefined)
    // A sentinel distinguishes "nothing stored" from "stored but unreadable".
    return parsed === undefined ? CORRUPT : parsed
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

/**
 * Reads the saved state, treating localStorage as untrusted.
 * `recovered` is true when stored data existed but could not be used, so the UI
 * can show a friendly notice instead of silently resetting.
 */
export function loadState() {
  let recovered = false
  const saved = readJSON(STATE_KEY)

  if (saved === CORRUPT) {
    // Unparsable JSON: drop it and start clean rather than crashing on every load.
    recovered = true
    try {
      localStorage.removeItem(STATE_KEY)
    } catch {
      // ignore storage errors
    }
  } else if (saved) {
    try {
      return { state: migrate(saved), recovered }
    } catch {
      // Structurally wrong, or written by a newer build. Fall through and reseed.
      recovered = true
    }
  }

  // Pick up data written by the previous (v0) version of the app.
  const legacyRooms = readJSON(LEGACY_ROOMS_KEY)
  const legacyStudents = readJSON(LEGACY_STUDENTS_KEY)
  if (legacyRooms && !isCorrupt(legacyRooms) && legacyStudents && !isCorrupt(legacyStudents)) {
    try {
      const migrated = migrate({ version: 0, rooms: legacyRooms, students: legacyStudents })
      saveState(migrated)
      return { state: migrated, recovered }
    } catch {
      // ignore and seed below
    }
  }

  const seeded = createDefaultState()
  saveState(seeded)
  return { state: seeded, recovered }
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
  // safeJsonParse drops __proto__/constructor/prototype at every depth.
  const parsed = safeJsonParse(await file.text(), undefined)
  if (parsed === undefined) return { ok: false, error: 'bad-json' }
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
  // loadState returns { state, recovered }: `recovered` flags saved data that
  // was corrupt, so the UI can explain the reset instead of silently doing it.
  const [initial] = useState(loadState)
  const [state, setState] = useState(initial.state)
  const [recovered, setRecovered] = useState(initial.recovered)

  const dismissRecovery = useCallback(() => setRecovered(false), [])

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
  const setInvigilators = useCallback(
    (list) =>
      setState((current) => ({
        ...current,
        invigilators: uniqueInvigilators(
          (list || []).map(normalizeInvigilator),
        ),
      })),
    [],
  )
  const updateSeating = useCallback(
    (changes) =>
      setState((current) => ({
        ...current,
        exams: current.exams.map((exam) =>
          exam.id === current.activeExamId
            ? {
                ...exam,
                seating: normalizeSeating({ ...exam.seating, ...changes }),
              }
            : exam,
        ),
      })),
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
  const setOnboarded = useCallback(
    (value) =>
      setState((current) => ({ ...current, onboarded: Boolean(value) })),
    [],
  )
  // Demo data skips the wizard and leaves the app ready to use.
  const loadDemoData = useCallback(
    () => setState({ ...createDefaultState(), onboarded: true }),
    [],
  )
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
    invigilators: state.invigilators,
    seating: exam ? exam.seating : createDefaultSeating(),
    plans: state.plans,
    plan: state.plans[activeExamId] || null,
    setInstitution,
    setRooms,
    setStudents,
    setActiveExam,
    updateExam,
    setExamStudentIds,
    setInvigilators,
    updateSeating,
    addExam,
    duplicateExam,
    deleteExam,
    setPlan,
    replaceState,
    setOnboarded,
    loadDemoData,
    resetData,
    onboarded: state.onboarded,
    recovered,
    dismissRecovery,
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