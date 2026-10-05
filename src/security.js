// Shared input sanitization for everything that crosses a trust boundary:
// imported CSV/XLSX/JSON files and data restored from localStorage.
//
// The rule is that imported and stored values are UNTRUSTED. They are never
// treated as markup (React escapes all rendering) and never trusted to have a
// sane shape, type or size. Everything funnels through these helpers.

/** Longest text kept for any single free-text field. */
export const MAX_TEXT = 200
/** Longest identifier (student id, exam id, room id). */
export const MAX_ID = 64
/** Most rows accepted from a CSV/XLSX import. */
export const MAX_IMPORT_ROWS = 20000
/** Most rooms / students / exams accepted from a file or backup. */
export const MAX_ROOMS = 500
export const MAX_STUDENTS = 20000
export const MAX_EXAMS = 200
/** Most assignments accepted per plan. */
export const MAX_ASSIGNMENTS = 100000

/**
 * Keys that can walk the prototype chain when used as an object key.
 * Assigning `obj['__proto__'] = x` mutates the prototype instead of creating a
 * property, so these are dropped on parse and rejected as keys.
 */
export const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** True if a key must never be used to build a property lookup. */
export function isForbiddenKey(key) {
  return FORBIDDEN_KEYS.has(String(key))
}

/**
 * Parse untrusted JSON, dropping prototype-polluting keys at every level.
 * `JSON.parse` alone does not pollute the prototype, but it happily creates an
 * own `__proto__` property that a later assignment would then use.
 */
export function safeJsonParse(source, fallback = null) {
  if (typeof source !== 'string') return fallback
  try {
    return JSON.parse(source, (key, value) =>
      isForbiddenKey(key) ? undefined : value,
    )
  } catch {
    return fallback
  }
}

/**
 * Coerce an untrusted value to a bounded, control-character-free string.
 *
 * C0/C1 control characters are stripped (they can corrupt a printed sheet or a
 * terminal) along with the Unicode line/paragraph separators, and the result is
 * truncated. Tabs and newlines survive inside CSV because they are data there.
 */
export function cleanText(value, max = MAX_TEXT) {
  if (value === null || value === undefined) return ''
  let str
  try {
    str = String(value)
  } catch {
    // A value with a hostile toString (only possible via a crafted object).
    return ''
  }
  // eslint-disable-next-line no-control-regex
  const stripped = str.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ')
  if (stripped.length <= max) return stripped.trim()
  return stripped.slice(0, max).trim()
}

/** `cleanText` for identifiers, with a tighter cap. */
export function cleanId(value, max = MAX_ID) {
  return cleanText(value, max)
}

/**
 * Safe key for building a lookup map. Returns '' for prototype-polluting keys
 * so callers can skip them instead of writing `obj['__proto__'] = value`.
 */
export function safeKey(value, max = MAX_ID) {
  const key = cleanId(value, max)
  return isForbiddenKey(key) ? '' : key
}

/**
 * Coerce to a finite integer within [min, max].
 */
export function safeInt(value, min, max, fallback = min) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  const truncated = Math.trunc(number)
  if (truncated < min) return min
  if (truncated > max) return max
  return truncated
}

/**
 * Returns a plain array capped at `max`, never a prototype-polluting object.
 */
export function safeArray(value, max = MAX_IMPORT_ROWS) {
  if (!Array.isArray(value)) return []
  return value.length > max ? value.slice(0, max) : value
}
