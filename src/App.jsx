import { useEffect, useState } from 'react'
import { LangProvider, useLang } from './i18n'
import {
  loadRooms,
  loadStudents,
  resetData,
  saveRooms,
  saveStudents,
} from './storage'

// Tab ids double as the i18n key suffix, e.g. "nav.setup".
const TABS = ['setup', 'plan', 'search']

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Placeholder({ title, text }) {
  const { t } = useLang()
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-10">
      <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        {t('page.comingSoon')}
      </span>
      <h2 className="mt-4 text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{text}</p>
    </section>
  )
}

function Shell() {
  const { t, toggle } = useLang()
  const [tab, setTab] = useState('setup')
  const [rooms, setRooms] = useState(loadRooms)
  const [students, setStudents] = useState(loadStudents)
  const [confirmingReset, setConfirmingReset] = useState(false)

  // Persist to localStorage whenever the data changes.
  useEffect(() => {
    saveRooms(rooms)
  }, [rooms])

  useEffect(() => {
    saveStudents(students)
  }, [students])

  function handleReset() {
    const seeded = resetData()
    setRooms(seeded.rooms)
    setStudents(seeded.students)
    setConfirmingReset(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              SP
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {t('app.title')}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              ↺ {t('reset.button')}
            </button>
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              🌐 {t('lang.switchTo')}
            </button>
          </div>
        </div>

        {confirmingReset && (
          <div className="border-t border-amber-200 bg-amber-50">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm text-amber-900">{t('reset.confirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {t('reset.confirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {t('reset.confirmNo')}
                </button>
              </div>
            </div>
          </div>
        )}

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {tab === 'setup' && (
          <div className="space-y-4">
            <Placeholder title={t('page.setup.title')} text={t('page.setup.text')} />
            <div className="grid max-w-md grid-cols-2 gap-3">
              <StatCard label={t('data.rooms')} value={rooms.length} />
              <StatCard label={t('data.students')} value={students.length} />
            </div>
          </div>
        )}
        {tab === 'plan' && (
          <Placeholder title={t('page.plan.title')} text={t('page.plan.text')} />
        )}
        {tab === 'search' && (
          <Placeholder title={t('page.search.title')} text={t('page.search.text')} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
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
      <Shell />
    </LangProvider>
  )
}
