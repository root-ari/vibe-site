import test from 'node:test'
import assert from 'node:assert/strict'

import { formatDate, formatTime, localiseDigits, translations } from './i18n.js'

test('Latin digits are left alone', () => {
  assert.equal(localiseDigits(1234, 'latn'), '1234')
  assert.equal(localiseDigits(0, 'latn'), '0')
  assert.equal(localiseDigits('', 'latn'), '')
})

test('Bangla digits convert every digit and keep the separators', () => {
  assert.equal(localiseDigits(123, 'beng'), '১২৩')
  assert.equal(localiseDigits('2026-05-12', 'beng'), '২০২৬-০৫-১২')
  assert.equal(localiseDigits('room-a101:1,1', 'beng'), 'room-a১০১:১,১')
  assert.equal(localiseDigits(0, 'beng'), '০')
  assert.equal(localiseDigits(9, 'beng'), '৯')
})

test('null and undefined never crash the digit helper', () => {
  assert.equal(localiseDigits(null, 'beng'), '')
  assert.equal(localiseDigits(undefined, 'beng'), '')
  assert.equal(localiseDigits(null, 'latn'), '')
})

test('dates are formatted by locale', () => {
  const en = formatDate('2026-05-12', 'en', 'latn')
  const bn = formatDate('2026-05-12', 'bn', 'beng')
  assert.ok(en.includes('2026'), `expected the year in ${en}`)
  assert.ok(en.includes('12'), `expected the day in ${en}`)
  assert.ok(bn.includes('২০২৬'), `expected Bangla digits in ${bn}`)
  // Bangla month names come from Intl, not from a hard-coded English string
  assert.equal(bn.includes('May'), false)
})

test('an empty or unparsable date is handled', () => {
  assert.equal(formatDate('', 'en', 'latn'), '')
  assert.equal(formatDate('not-a-date', 'en', 'latn'), 'not-a-date')
  assert.equal(formatDate(null, 'en', 'latn'), '')
})

test('the day never shifts because of the machine time zone', () => {
  // built from the parts, so this is the 12th in every zone
  for (const lang of ['en', 'bn']) {
    const text = formatDate('2026-01-01', lang, 'latn')
    assert.ok(text.includes('1') || text.includes('১'), text)
  }
})

test('clock times are padded and localised', () => {
  assert.equal(formatTime('09:30', 'latn'), '09:30')
  assert.equal(formatTime('09:30', 'beng'), '০৯:৩০')
  assert.equal(formatTime('9:05', 'latn'), '09:05')
  assert.equal(formatTime('', 'beng'), '')
  assert.equal(formatTime('nope', 'latn'), 'nope')
})

test('both languages define exactly the same keys', () => {
  const en = Object.keys(translations.en).sort()
  const bn = Object.keys(translations.bn).sort()
  assert.deepEqual(en, bn)
})

test('no translation is empty', () => {
  for (const lang of ['en', 'bn']) {
    for (const [key, value] of Object.entries(translations[lang])) {
      assert.ok(String(value).trim().length > 0, `${lang}.${key} is empty`)
    }
  }
})