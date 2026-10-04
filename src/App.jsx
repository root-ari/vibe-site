import { useEffect, useRef, useState } from 'react'
import { LangProvider, useLang } from './i18n'
import {
  DataProvider,
  downloadBackup,
  readBackupFile,
  readImageAsDataUrl,
  totalCapacity,
  useData,
} from './storage'
import ImportPanel from './ImportPanel.jsx'
import PlanPage from './PlanPage.jsx'
import ExamsPage from './ExamsPage.jsx'
import PrintPage from './PrintPage.jsx'

// Tab ids double as the i18n key suffix, e.g. "nav.setup".
const TABS = ['setup', 'exams', 'plan', 'search', 'print']

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Placeholder({ title, text: body }) {
  const { t } = useLang()
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-10">
      <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        {t('page.comingSoon')}
      </span>
      <h2 className="mt-4 text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{body}</p>
    </section>
  )
}

function SetupPage() {
  const { t, lang, toggle } = useLang()
  const {
    state,
    institution,
    exam,
    exams,
    rooms,
    students,
    setInstitution,
    updateExam,
    replaceState,
    resetData,
  } = useData()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [notice, setNotice] = useState(null)
  const logoInput = useRef(null)
  const importInput = useRef(null)

  // Institution.language always mirrors the UI language.
  useEffect(() => {
    if (institution.language !== lang) setInstitution({ language: lang })
  }, [lang, institution.language, setInstitution])

  async function handleLogo(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await readImageAsDataUrl(file)
    if (result.ok) {
      setInstitution({ logo: result.dataUrl })
      setNotice(null)
    } else {
      setNotice({ type: 'error', text: t(`logo.error.${result.error}`) })
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await readBackupFile(file)
    if (result.ok) {
      replaceState(result.state)
      setNotice({ type: 'ok', text: t('import.ok') })
    } else {
      setNotice({ type: 'error', text: t(`import.error.${result.error}`) })
    }
  }

  function handleReset() {
    resetData()
    setConfirmingReset(false)
    setNotice({ type: 'ok', text: t('reset.done') })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('data.exams')} value={exams.length} />
        <StatCard label={t('data.rooms')} value={rooms.length} />
        <StatCard label={t('data.students')} value={students.length} />
        <StatCard label={t('data.seats')} value={totalCapacity(rooms)} />
      </div>

      <Card title={t('setup.institution.title')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('setup.institution.name')}>
            <input
              className={inputClass}
              value={institution.name}
              onChange={(event) => setInstitution({ name: event.target.value })}
            />
          </Field>
          <Field label={t('setup.institution.language')}>
            <select
              className={inputClass}
              value={lang}
              onChange={(event) => {
                if (event.target.value !== lang) toggle()
              }}
            >
              <option value="en">{t('lang.en')}</option>
              <option value="bn">{t('lang.bn')}</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {institution.logo && (
            <img
              src={institution.logo}
              alt={t('setup.institution.logo')}
              className="h-12 w-12 rounded-lg border border-slate-200 object-contain"
            />
          )}
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogo}
          />
          <button
            type="button"
            className={buttonClass}
            onClick={() => logoInput.current?.click()}
          >
            {t('setup.institution.logoChoose')}
          </button>
          {institution.logo && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => setInstitution({ logo: null })}
            >
              {t('setup.institution.logoRemove')}
            </button>
          )}
        </div>
      </Card>

      {exam && (
        <Card title={t('setup.exam.title')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('setup.exam.id')}>
            <input
              className={inputClass}
              value={exam.id}
              onChange={(event) => updateExam({ id: event.target.value })}
            />
          </Field>
          <Field label={t('setup.exam.name')}>
            <input
              className={inputClass}
              value={exam.title}
              onChange={(event) => updateExam({ title: event.target.value })}
            />
          </Field>
          <Field label={t('setup.exam.date')}>
            <input
              type="date"
              className={inputClass}
              value={exam.date}
              onChange={(event) => updateExam({ date: event.target.value })}
            />
          </Field>
          <Field label={t('setup.exam.start')}>
            <input
              type="time"
              className={inputClass}
              value={exam.startTime}
              onChange={(event) => updateExam({ startTime: event.target.value })}
            />
          </Field>
          <Field label={t('setup.exam.end')}>
            <input
              type="time"
              className={inputClass}
              value={exam.endTime}
              onChange={(event) => updateExam({ endTime: event.target.value })}
            />
          </Field>
        </div>
      </Card>
      )}

      <ImportPanel />

      <Card title={t('setup.rooms.title')}>
        <ul className="divide-y divide-slate-100 text-sm">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="font-medium text-slate-900">
                {room.name}
                {room.building && (
                  <span className="ml-1 font-normal text-slate-500">
                    ({room.building})
                  </span>
                )}
              </span>
              <span className="text-slate-500">
                {t('setup.rooms.size')} {room.rows}×{room.cols} ·{' '}
                {t('setup.rooms.bench')} {room.seatsPerBench} ·{' '}
                {t('setup.rooms.broken')} {room.brokenSeats.length || t('common.none')}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('setup.backup.title')}>
        <p className="mb-4 text-sm text-slate-600">{t('setup.backup.hint')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => downloadBackup(state)}
          >
            {t('setup.backup.export')}
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            type="button"
            className={buttonClass}
            onClick={() => importInput.current?.click()}
          >
            {t('setup.backup.import')}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setConfirmingReset(true)}
          >
            ↺ {t('reset.button')}
          </button>
        </div>

        {confirmingReset && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">{t('reset.confirm')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t('reset.confirmYes')}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => setConfirmingReset(false)}
              >
                {t('reset.confirmNo')}
              </button>
            </div>
          </div>
        )}

        {notice && (
          <p
            role="status"
            className={
              'mt-4 rounded-lg px-3 py-2 text-sm ' +
              (notice.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700')
            }
          >
            {notice.text}
          </p>
        )}
      </Card>

      <p className="text-xs text-slate-500">{t('page.setup.text')}</p>
    </div>
  )
}

function Header({ tab, setTab }) {
  const { t, toggle } = useLang()
  const { institution } = useData()

  return (
    <header className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {institution.logo ? (
            <img
              src={institution.logo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-contain"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              SP
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {t('app.title')}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {t('app.subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          🌐 {t('lang.switchTo')}
        </button>
      </div>

      <nav className="mx-auto w-full max-w-6xl px-4" aria-label={t('app.title')}>
        <ul className="flex gap-1 overflow-x-auto pb-2">
          {TABS.map((id) => {
            const active = tab === id
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(id)}
                  className={
                    'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ' +
                    (active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  {t('nav.' + id)}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

function Shell() {
  const { t } = useLang()
  const [tab, setTab] = useState('setup')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header tab={tab} setTab={setTab} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {tab === 'setup' && <SetupPage />}
        {tab === 'exams' && <ExamsPage />}
        {tab === 'plan' && <PlanPage />}
        {tab === 'search' && (
          <Placeholder title={t('page.search.title')} text={t('page.search.text')} />
        )}
        {tab === 'print' && <PrintPage />}
      </main>

      <footer className="print:hidden border-t border-slate-200 bg-white">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-slate-500">
          {t('footer.note')}
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </LangProvider>
  )
}