import { useRef, useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import {
  ROOM_FIELDS,
  STUDENT_FIELDS,
  buildErrorCsv,
  buildTable,
  downloadCsv,
  guessMapping,
  parseCsv,
  readImportFile,
  roomTemplateCsv,
  studentTemplateCsv,
  validateRooms,
  validateStudents,
} from './parse'

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function ImportPanel() {
  const { t } = useLang()
  const { rooms, students, setRooms, setStudents } = useData()

  const [mode, setMode] = useState('students')
  const [paste, setPaste] = useState('')
  const [table, setTable] = useState(null)
  const [mapping, setMapping] = useState({})
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(0)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const fields = mode === 'students' ? STUDENT_FIELDS : ROOM_FIELDS

  function clear() {
    setTable(null)
    setMapping({})
    setReport(null)
    setError(null)
  }

  function changeMode(next) {
    setMode(next)
    clear()
  }

  function loadRows(rows, source) {
    const built = buildTable(rows)
    if (built.headers.filter(Boolean).length === 0) {
      setError('import.error.no-headers')
      setTable(null)
      return
    }
    setTable({ ...built, source })
    setMapping(guessMapping(built.headers, fields))
    setReport(null)
    setError(null)
    setDone(0)
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    const result = await readImportFile(file)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      setTable(null)
      return
    }
    loadRows(result.rows, result.source)
  }

  function handlePaste() {
    if (!paste.trim()) {
      setError('import.error.no-table')
      return
    }
    loadRows(parseCsv(paste), '')
  }

  function handleValidate() {
    if (!table) {
      setError('import.error.no-table')
      return
    }
    const options = { roomNames: rooms.map((room) => room.name) }
    const result =
      mode === 'students'
        ? validateStudents(table.records, mapping, {
            ...options,
            existingIds: new Set(students.map((student) => student.id.toLowerCase())),
          })
        : validateRooms(table.records, mapping, options)
    setReport(result)
    setError(null)
  }

  function handleApply() {
    if (!report || report.accepted.length === 0) return
    if (mode === 'students') setStudents([...students, ...report.accepted])
    else setRooms([...rooms, ...report.accepted])
    setDone(report.accepted.length)
    clear()
  }

  const errors = report ? report.issues.filter((i) => i.severity === 'error') : []
  const warnings = report ? report.issues.filter((i) => i.severity === 'warning') : []

  function downloadTemplate() {
    if (mode === 'students') {
      downloadCsv('students-template.csv', studentTemplateCsv())
    } else {
      downloadCsv('rooms-template.csv', roomTemplateCsv())
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold sm:text-lg">{t('import.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('import.subtitle')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {['students', 'rooms'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => changeMode(option)}
            className={
              'rounded-lg px-3 py-2 text-sm font-medium transition ' +
              (mode === option
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100')
            }
          >
            {t('data.' + option)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          className={buttonClass}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? '⋯' : t('import.chooseFile')}
        </button>
        <button type="button" className={buttonClass} onClick={downloadTemplate}>
          {t('import.template')}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {t('import.paste')}
        </span>
        <textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <button
        type="button"
        className={`${buttonClass} mt-2`}
        onClick={handlePaste}
      >
        {t('import.readPaste')}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {t(error)}
        </p>
      )}
      {done > 0 && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {t('import.done')} ({done})
        </p>
      )}

      {table && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {t('import.file')}: {table.source || '—'} ·{' '}
            {t('import.rowsRead')}: {table.records.length}
          </p>
          <h3 className="mt-3 text-sm font-semibold">{t('import.mapping')}</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  {t(field.label)}{' '}
                  <span className="font-normal text-slate-400">
                    (
                    {field.required
                      ? t('import.required')
                      : field.checkOnly
                        ? t('import.checkOnly')
                        : t('import.optional')}
                    )
                  </span>
                </span>
                <select
                  className={selectClass}
                  value={mapping[field.key] ?? -1}
                  onChange={(event) =>
                    setMapping({
                      ...mapping,
                      [field.key]: Number(event.target.value),
                    })
                  }
                >
                  <option value={-1}>{t('import.notMapped')}</option>
                  {table.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `#${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={`${primaryClass} mt-4`}
            onClick={handleValidate}
          >
            {t('import.validate')}
          </button>
        </div>
      )}

      {report && (
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="font-semibold">{t('import.accepted')}:</span>{' '}
                {report.accepted.length}
              </span>
              <span>
                <span className="font-semibold">{t('import.rejected')}:</span>{' '}
                {errors.length}
              </span>
              <span>
                <span className="font-semibold">{t('import.warnings')}:</span>{' '}
                {warnings.length}
              </span>
            </div>

            {report.issues.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                {t('import.noIssues')}
              </p>
            ) : (
              <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs">
                {report.issues.map((item, index) => (
                  <li
                    key={index}
                    className={
                      item.severity === 'error'
                        ? 'text-red-700'
                        : 'text-amber-700'
                    }
                  >
                    <span className="font-medium">#{item.rowNumber}</span>{' '}
                    {t('import.reason.' + item.reason)}
                    {item.field && ` · ${item.field}`}
                    {item.value && ` · ${item.value}`}
                    {item.note && ` · ${item.note}`}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryClass}
                onClick={handleApply}
                disabled={report.accepted.length === 0}
              >
                {t('import.apply')}
              </button>
              {report.issues.length > 0 && (
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() =>
                    downloadCsv(
                      'import-errors.csv',
                      buildErrorCsv(report.issues, (reason) =>
                        t('import.reason.' + reason),
                      ),
                    )
                  }
                >
                  {t('import.downloadErrors')}
                </button>
              )}
            </div>
          </div>
        )}
    </section>
  )
}