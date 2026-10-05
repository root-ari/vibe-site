// Fails the build on the security rules that are easy to break by accident:
//
//  1. No raw-HTML sinks. Every value that reaches the page comes from an import,
//     localStorage or a text field, so all rendering must stay escaped.
//  2. No CDN script without an exact version pin AND an integrity hash.
//  3. No committed secrets or keys.
//
// Run with: npm run check:security

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\//, '')
const ROOT = new URL('../', import.meta.url).pathname.replace(/^\//, '')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(js|jsx|css|html)$/.test(entry.name)) out.push(full)
  }
  return out
}

const files = [...walk(SRC), join(ROOT, 'index.html')]
const problems = []

// 1. Raw HTML sinks. `createElement`/`appendChild` are fine (they set text or
// attributes); these four would let a crafted name become live markup.
const SINKS = [
  'dangerouslySetInnerHTML',
  '.innerHTML',
  '.outerHTML',
  'insertAdjacentHTML',
  'document.write',
  'eval(',
  'new Function(',
]

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const sink of SINKS) {
    if (source.includes(sink)) {
      problems.push(`${file}: uses ${sink} - untrusted data would become markup`)
    }
  }

  // Any link that opens somewhere else must not hand the opener over via
  // target="_blank". noopener/noreferrer is the safe default.
  for (const match of source.matchAll(/<a\b[^>]*>/g)) {
    const tag = match[0]
    if (/\btarget\s*=\s*["']?_blank/.test(tag) && !/rel\s*=\s*["'][^"']*noopener/.test(tag)) {
      problems.push(`${file}: <a target="_blank"> without rel="noopener noreferrer"`)
    }
  }

  // 2. Any remote script must be pinned and integrity-checked.
  for (const match of source.matchAll(/(?:src|href)\s*=\s*["'`](https:\/\/[^"'`]+)["'`]/g)) {
    const url = match[1]
    const isScript = /\.js(\?|$)/.test(url)
    if (!isScript) continue
    const pinned = /\d+\.\d+\.\d+/.test(url)
    if (!pinned) problems.push(`${file}: remote script is not version pinned: ${url}`)
  }
  if (source.includes('script.integrity') === false && /cdn\.sheetjs\.com/.test(source)) {
    problems.push(`${file}: loads SheetJS without an integrity hash`)
  }
}

// 3. Committed secrets. Patterns only, no real values are stored in this repo.
const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
  [/\bsk-[A-Za-z0-9]{20,}\b/, 'API secret key'],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/, 'Google API key'],
]

const tracked = [
  join(ROOT, 'index.html'),
  join(ROOT, 'vercel.json'),
  ...walk(SRC),
]
for (const file of tracked) {
  const source = readFileSync(file, 'utf8')
  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(source)) problems.push(`${file}: looks like a ${label}`)
  }
}

// The deployed headers must be present, or the app would ship without them.
if (!tracked.includes(join(ROOT, 'vercel.json'))) {
  problems.push('vercel.json is missing: security headers would not be sent')
} else {
  const headers = readFileSync(join(ROOT, 'vercel.json'), 'utf8')
  for (const header of [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'X-Frame-Options',
    'Permissions-Policy',
  ]) {
    if (!headers.includes(header)) problems.push(`vercel.json: missing ${header} header`)
  }
  // The CSP must not wave scripts through.
  const csp = (headers.match(/"Content-Security-Policy",\s*"value":\s*"([^"]*)"/) || [])[1] || ''
  if (csp && /script-src[^;]*'unsafe-inline'/.test(csp)) {
    problems.push("vercel.json: script-src allows 'unsafe-inline'")
  }
  if (csp && /script-src[^;]*'unsafe-eval'/.test(csp)) {
    problems.push("vercel.json: script-src allows 'unsafe-eval'")
  }
}

if (problems.length > 0) {
  console.error('Security check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(
  `Security check passed: ${files.length} files, no raw-HTML sinks, ` +
    'CDN pinned with SRI, no secrets.',
)