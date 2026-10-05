/**
 * Fails (exit code 1) when the translation dictionaries are out of step:
 *   - a key present in one language but missing in another
 *   - a key declared twice in the same language block, which JavaScript would
 *     silently discard
 *   - an empty or whitespace-only translation
 *   - a language block that is missing or is not an object
 *
 * Run with: npm run check:i18n
 */
import { readdirSync, readFileSync } from 'node:fs'
import { translations } from '../src/i18n.js'

const source = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8')
const problems = []

// Object literals cannot report duplicate keys at runtime, so the file is read.
function declaredKeys(lang) {
  const start = source.indexOf(`  ${lang}: {`)
  if (start === -1) return null
  let depth = 0
  let end = -1
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null
  const found = []
  for (const match of source.slice(start, end).matchAll(/^\s*'([^']+)'\s*:/gm)) {
    found.push(match[1])
  }
  return found
}

const langs = Object.keys(translations)
if (langs.length < 2) problems.push('expected at least two languages')

for (const lang of langs) {
  const table = translations[lang]
  if (!table || typeof table !== 'object') {
    problems.push(`translations.${lang} is missing or is not an object`)
    continue
  }
  const declared = declaredKeys(lang)
  if (declared === null) {
    problems.push(`could not find the '${lang}' block in src/i18n.js`)
  } else {
    const seen = new Set()
    for (const key of declared) {
      if (seen.has(key)) {
        problems.push(`${lang}: duplicate key '${key}' (the later value silently wins)`)
      }
      seen.add(key)
    }
    if (declared.length !== Object.keys(table).length) {
      problems.push(
        `${lang}: ${declared.length} keys declared but ${Object.keys(table).length} survive - one was overwritten`,
      )
    }
  }
  for (const [key, value] of Object.entries(table)) {
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${lang}: '${key}' has an empty translation`)
    }
  }
}

for (let i = 0; i < langs.length; i += 1) {
  for (let j = i + 1; j < langs.length; j += 1) {
    const left = new Set(Object.keys(translations[langs[i]] || {}))
    const right = new Set(Object.keys(translations[langs[j]] || {}))
    for (const key of left) {
      if (!right.has(key)) problems.push(`'${key}' is in ${langs[i]} but missing from ${langs[j]}`)
    }
    for (const key of right) {
      if (!left.has(key)) problems.push(`'${key}' is in ${langs[j]} but missing from ${langs[i]}`)
    }
  }
}

// Every t('...') in the app must resolve, so a stale key is caught here rather
// than as a blank label at runtime.
const known = new Set(Object.keys(translations[langs[0]] || {}))
const sourceDir = new URL('../src/', import.meta.url)
for (const file of readdirSync(sourceDir)) {
  if (!/\.(js|jsx)$/.test(file) || file === 'i18n.js' || file.endsWith('.test.js')) {
    continue
  }
  const code = readFileSync(new URL(file, sourceDir), 'utf8')
  for (const match of code.matchAll(/\bt\(\s*'([^']+)'(?!\s*\+)/g)) {
    if (!known.has(match[1])) {
      problems.push(`${file}: t('${match[1]}') has no translation`)
    }
  }
  // t('prefix.' + something) - at least one key must start with that prefix
  for (const match of code.matchAll(/\bt\(\s*'([a-z][\w]*(?:\.[\w]+)*\.)\s*\+/g)) {
    if (![...known].some((key) => key.startsWith(match[1]))) {
      problems.push(`${file}: dynamic key prefix '${match[1]}' matches no translation`)
    }
  }
}

if (problems.length > 0) {
  console.error(`i18n check FAILED with ${problems.length} problem(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const count = Object.keys(translations[langs[0]]).length
console.log(`i18n check passed: ${langs.join(' + ')}, ${count} keys each.`)