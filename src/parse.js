// Parsing, column mapping and validation for importing rooms and students.
//
// CSV is parsed here with no dependency. .xlsx/.xls is handled by SheetJS,
// which is lazily loaded from a CDN and only when a spreadsheet is chosen,
// so CSV importing keeps working with no network.

const SHEETJS_URL =
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const BOM = '\uFEFF'

/* ----------------------------- text ----------------------------- */

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

// A U+FFFD means the bytes were not valid UTF-8 (Bangla text shows as mojibake).
export function looksMojibake(text) {
  return text.includes('\uFFFD')
}

/* ------------------------------ CSV ----------------------------- */

// RFC 4180 style: handles quoted fields, doubled quotes, CRLF and blank lines.
export function parseCsv(input) {
  const text = stripBom(input)
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

// Excel only detects UTF-8 when a BOM is present, which matters for Bangla.
export function downloadCsv(filename, csvText) {
  const url = URL.createObjectURL(
    new Blob([BOM + csvText], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/* --------------------------- SheetJS ---------------------------- */

let sheetJsPromise = null

function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  if (sheetJsPromise) return sheetJsPromise
  sheetJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SHEETJS_URL
    script.async = true
    script.onload = () =>
      window.XLSX ? resolve(window.XLSX) : reject(new Error('no-xlsx'))
    script.onerror = () => reject(new Error('network'))
    document.head.appendChild(script)
  }).catch((error) => {
    sheetJsPromise = null
    throw error
  })
  return sheetJsPromise
}

export async function readImportFile(file) {
  if (!file) return { ok: false, error: 'import.error.read' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'import.error.too-large' }

  if (/\.(xlsx|xls)$/i.test(file.name)) {
    let XLSX
    try {
      XLSX = await loadSheetJs()
    } catch {
      return { ok: false, error: 'import.error.sheetjs' }
    }
    try {
      const book = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
        type: 'array',
      })
      const sheet = book.Sheets[book.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
        blankrows: true,
      })
      return { ok: true, rows, source: file.name }
    } catch {
      return { ok: false, error: 'import.error.read' }
    }
  }

  const text = stripBom(await file.text())
  if (looksMojibake(text)) return { ok: false, error: 'import.error.encoding' }
  return { ok: true, rows: parseCsv(text), source: file.name }
}

/* --------------------------- table shape -------------------------- */

// Row 1 is the heading line; data rows keep their spreadsheet row number so
// the error report can point back at the original file.
export function buildTable(rows) {
  const headers = (rows[0] || []).map((cell) =>
    stripBom(String(cell ?? '')).trim(),
  )
  const records = rows.slice(1).map((cells, index) => {
    const values = (cells || []).map((cell) => String(cell ?? '').trim())
    return {
      rowNumber: index + 2,
      values,
      isBlank: values.length === 0 || values.every((value) => value === ''),
    }
  })
  return { headers, records }
}

/* ------------------------- column mapping ------------------------- */

export const STUDENT_FIELDS = [
  { key: 'id', label: 'import.field.id', required: true,
    hints: ['id', 'studentid', 'studentcode', 'roll', 'rollno', 'reg', 'registration', 'registrationno', 'code', 'কোড'] },
  { key: 'name', label: 'import.field.name', required: true,
    hints: ['name', 'studentname', 'fullname', 'নাম'] },
  { key: 'course', label: 'import.field.course', required: true,
    hints: ['course', 'subject', 'subjectcode', 'coursename', 'কোর্স'] },
  { key: 'department', label: 'import.field.department', required: false,
    hints: ['department', 'dept', 'faculty', 'বিভাগ'] },
  { key: 'section', label: 'import.field.section', required: false,
    hints: ['section', 'batch', 'semester', 'sem', 'শেষ'] },
  { key: 'room', label: 'import.field.room', required: false, checkOnly: true,
    hints: ['room', 'roomname', 'allocatedroom', 'কক্ষ'] },
]

export const ROOM_FIELDS = [
  { key: 'name', label: 'import.field.roomName', required: true,
    hints: ['name', 'room', 'roomname', 'কক্ষ'] },
  { key: 'building', label: 'import.field.building', required: false,
    hints: ['building', 'block', 'ভবন'] },
  { key: 'rows', label: 'import.field.rows', required: true,
    hints: ['rows', 'row', 'norows'] },
  { key: 'cols', label: 'import.field.cols', required: true,
    hints: ['cols', 'col', 'columns', 'column', 'nocols'] },
  { key: 'seatsPerBench', label: 'import.field.seatsPerBench', required: false,
    hints: ['seatsperbench', 'seatperbench', 'perbench', 'benchseats', 'bench'] },
  { key: 'brokenSeats', label: 'import.field.brokenSeats', required: false,
    hints: ['broken', 'brokenseats', 'brokenseat', 'damaged'] },
]

// Lowercase, strip punctuation, but keep Bangla letters so Bangla headers match.
function normalizeHeader(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '')
}

export function guessMapping(headers, fields) {
  const normalized = headers.map(normalizeHeader)
  const used = new Set()
  const mapping = {}

  for (const field of fields) {
    let index = normalized.findIndex(
      (header, i) => !used.has(i) && field.hints.includes(header),
    )
    if (index === -1) {
      index = normalized.findIndex(
        (header, i) =>
          !used.has(i) &&
          header !== '' &&
          field.hints.some((hint) => header.includes(hint)),
      )
    }
    mapping[field.key] = index
    if (index !== -1) used.add(index)
  }
  return mapping
}

/* --------------------------- validation --------------------------- */

function valueAt(record, index) {
  return index >= 0 && index < record.values.length ? record.values[index] : ''
}

function issue(rowNumber, severity, reason, field, value, note = '') {
  return { rowNumber, severity, reason, field, value, note }
}

export function validateStudents(records, mapping, options = {}) {
  const existingIds = options.existingIds || new Set()
  const roomNames = new Set(
    (options.roomNames || []).map((name) => String(name).toLowerCase()),
  )
  const accepted = []
  const issues = []
  const seen = new Map()

  for (const record of records) {
    const get = (key) => valueAt(record, mapping[key])

    if (record.isBlank) {
      issues.push(issue(record.rowNumber, 'error', 'blank', '', ''))
      continue
    }

    const id = get('id')
    const name = get('name')
    const course = get('course')
    const missing = [
      ['id', id],
      ['name', name],
      ['course', course],
    ]
      .filter((entry) => !entry[1])
      .map((entry) => entry[0])

    if (missing.length) {
      for (const field of missing) {
        issues.push(issue(record.rowNumber, 'error', 'missing', field, ''))
      }
      continue
    }

    const key = id.toLowerCase()
    if (seen.has(key)) {
      issues.push(
        issue(record.rowNumber, 'error', 'duplicate', 'id', id, `first seen on row ${seen.get(key)}`),
      )
      continue
    }
    if (existingIds.has(key)) {
      issues.push(
        issue(record.rowNumber, 'error', 'duplicate', 'id', id, 'already in this plan'),
      )
      continue
    }

    // A room column is never stored, only checked against known rooms.
    const room = get('room')
    if (room && !roomNames.has(room.toLowerCase())) {
      issues.push(issue(record.rowNumber, 'warning', 'unknown-room', 'room', room, ''))
    }

    seen.set(key, record.rowNumber)
    accepted.push({
      id,
      name,
      course,
      department: get('department'),
      section: get('section'),
    })
  }

  return { accepted, issues }
}

// Accepts [[1,2],[2,3]] JSON or "1,2;2,3" pairs.
export function parseBrokenSeats(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // not JSON, fall through to the pair format
    }
  }
  return text
    .split(';')
    .map((part) => part.split(',').map((value) => Number(value.trim())))
    .filter(([row, col]) => Number.isFinite(row) && Number.isFinite(col))
    .map(([row, col]) => [row, col])
}

export function validateRooms(records, mapping, options = {}) {
  const existingNames = new Set(
    (options.roomNames || []).map((name) => String(name).toLowerCase()),
  )
  const accepted = []
  const issues = []
  const seen = new Map()

  for (const record of records) {
    const get = (key) => valueAt(record, mapping[key])

    if (record.isBlank) {
      issues.push(issue(record.rowNumber, 'error', 'blank', '', ''))
      continue
    }

    const name = get('name')
    const rawRows = get('rows')
    const rawCols = get('cols')
    const rows = Number(rawRows)
    const cols = Number(rawCols)

    const missing = []
    if (!name) missing.push(['name', ''])
    if (!rawRows) missing.push(['rows', ''])
    else if (!Number.isFinite(rows) || rows < 1) missing.push(['rows', rawRows])
    if (!rawCols) missing.push(['cols', ''])
    else if (!Number.isFinite(cols) || cols < 1) missing.push(['cols', rawCols])

    if (missing.length) {
      for (const entry of missing) {
        issues.push(issue(record.rowNumber, 'error', 'missing', entry[0], entry[1]))
      }
      continue
    }

    const key = name.toLowerCase()
    if (seen.has(key)) {
      issues.push(
        issue(record.rowNumber, 'error', 'duplicate', 'name', name, `first seen on row ${seen.get(key)}`),
      )
      continue
    }
    if (existingNames.has(key)) {
      issues.push(
        issue(record.rowNumber, 'error', 'duplicate', 'name', name, 'already in this plan'),
      )
      continue
    }

    seen.set(key, record.rowNumber)
    accepted.push({
      // id is left blank; the state module assigns a unique one
      id: '',
      name,
      building: get('building'),
      rows: Math.trunc(rows),
      cols: Math.trunc(cols),
      seatsPerBench: get('seatsPerBench'),
      brokenSeats: parseBrokenSeats(get('brokenSeats')),
    })
  }

  return { accepted, issues }
}

/* --------------------------- reporting ---------------------------- */

export function buildErrorCsv(issues, translateReason) {
  const header = ['row', 'severity', 'reason', 'field', 'value', 'note']
  const rows = issues.map((item) => [
    item.rowNumber,
    item.severity,
    translateReason ? translateReason(item.reason) : item.reason,
    item.field,
    item.value,
    item.note,
  ])
  return toCsv([header, ...rows])
}

export function studentTemplateCsv() {
  return toCsv([
    ['id', 'name', 'course', 'department', 'section'],
    ['241-15-1001', 'Rahim Uddin', 'CSE221', 'CSE', 'A'],
    ['241-15-1002', 'নুসরাত জাহান', 'CSE221', 'CSE', 'A'],
  ])
}

export function roomTemplateCsv() {
  return toCsv([
    ['name', 'building', 'rows', 'cols', 'seatsPerBench', 'brokenSeats'],
    ['A-101', 'A', '4', '3', '3', ''],
    ['A-103', 'A', '2', '2', '2', '1,2'],
  ])
}