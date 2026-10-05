import { useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import { generatePlan, normalizeOptions } from './seating.js'
import { conflictingRoomIds } from './exams.js'

const STEPS = [
  { title: 'wizard.institution', body: 'wizard.institutionBody' },
  { title: 'wizard.rooms', body: 'wizard.roomsBody' },
  { title: 'wizard.students', body: 'wizard.studentsBody' },
  { title: 'wizard.generate', body: 'wizard.generateBody' },
]

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const primaryClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'

export default function SetupWizard() {
  const { t, n } = useLang()
  const {
    institution,
    rooms,
    students,
    exam,
    examStudents,
    exams,
    plans,
    activeExamId,
    setInstitution,
    setPlan,
    loadDemoData,
    setOnboarded,
  } = useData()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const usableRooms = rooms.filter(
    (room) =>
      !conflictingRoomIds({ exams, plans, activeExamId }).has(room.id),
  )

  function handleGenerate() {
    setBusy(true)
    setNote('')
    // Yield once so the "Working…" state paints before the search runs.
    setTimeout(() => {
      const result = generatePlan({
        rooms: usableRooms,
        students: examStudents,
        examId: exam ? exam.id : '',
        options: normalizeOptions({}),
      })
      setPlan(result.plan)
      setBusy(false)
      setNote(`${result.totals.seated} / ${result.totals.capacity}`)
    }, 0)
  }

  function finish() {
    setOnboarded(true)
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="mx-auto w-full max-w-2xl">
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
        role="dialog"
        aria-labelledby="wizard-title"
      >
        <p className="text-xs font-medium text-slate-500">
          {t('wizard.title')} · {t('wizard.step')} {n(step + 1)} / {n(STEPS.length)}
        </p>
        <h1 id="wizard-title" className="mt-1 text-xl font-semibold">
          {t(STEPS[step].title)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t(STEPS[step].body)}</p>

        <div className="mt-6">
          {step === 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {t('setup.institution.name')}
              </span>
              <input
                className={inputClass}
                autoFocus
                value={institution.name}
                onChange={(event) =>
                  setInstitution({ name: event.target.value })
                }
              />
            </label>
          )}

          {(step === 1 || step === 2) && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                {step === 1
                  ? `${t('data.rooms')}: ${n(rooms.length)}`
                  : `${t('data.students')}: ${n(students.length)}`}
              </p>
              {(step === 1 ? rooms.length : students.length) === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {step === 1 ? t('state.noRooms') : t('state.noStudents')}
                </p>
              ) : null}
              <button type="button" className={buttonClass} onClick={loadDemoData}>
                {t('demo.load')}
              </button>
              <p className="text-xs text-slate-500">{t('demo.body')}</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                {t('data.rooms')}: {n(usableRooms.length)} ·{' '}
                {t('data.students')}: {n(examStudents.length)}
              </p>
              {usableRooms.length === 0 || examStudents.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {usableRooms.length === 0
                    ? t('state.noRooms')
                    : t('state.noStudents')}
                </p>
              ) : (
                <button
                  type="button"
                  className={primaryClass}
                  disabled={busy}
                  onClick={handleGenerate}
                >
                  {busy ? t('state.loading') : t('wizard.generate')}
                </button>
              )}
              {busy && (
                <p role="status" className="text-sm text-slate-600">
                  {t('state.loading')}
                </p>
              )}
              {note && (
                <p role="status" className="text-sm text-emerald-700">
                  {t('wizard.saved')} ({note})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {step > 0 && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => setStep(step - 1)}
            >
              {t('wizard.back')}
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              className={primaryClass}
              onClick={() => setStep(step + 1)}
            >
              {t('wizard.next')}
            </button>
          )}
          {isLast && (
            <button type="button" className={primaryClass} onClick={finish}>
              {t('wizard.finish')}
            </button>
          )}
          <button
            type="button"
            className={`${buttonClass} ml-auto`}
            onClick={finish}
          >
            {t('wizard.skip')}
          </button>
        </div>
      </section>
    </div>
  )
}