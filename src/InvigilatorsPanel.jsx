import { useState } from 'react'
import { useLang } from './i18n'
import { useData } from './storage'
import {
  autoAssignInvigilators,
  isBusyElsewhere,
  staffingSummary,
} from './invigilators.js'

const buttonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
const primaryClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export default function InvigilatorsPanel() {
  const { t, n } = useLang()
  const { invigilators, rooms, seating, setInvigilators, updateSeating } = useData()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')

  const assignments = seating.invigilatorAssignments
  const summary = staffingSummary({
    rooms,
    assignments,
    perRoom: seating.invigilatorsPerRoom,
  })

  function handleAdd() {
    if (!name.trim()) return
    setInvigilators([
      ...invigilators,
      { name: name.trim(), phone: phone.trim(), department: department.trim() },
    ])
    setName('')
    setPhone('')
    setDepartment('')
  }

  function handleRemove(id) {
    setInvigilators(
      invigilators.filter((item) => String(item.id) !== String(id)),
    )
  }

  function handleAutoAssign() {
    updateSeating({
      invigilatorAssignments: autoAssignInvigilators({
        rooms,
        invigilators,
        perRoom: seating.invigilatorsPerRoom,
        existing: assignments,
      }),
    })
  }

  function toggle(roomId, invigilatorId) {
    const list = assignments[roomId] || []
    const key = String(invigilatorId)
    if (list.includes(key)) {
      updateSeating({
        invigilatorAssignments: {
          ...assignments,
          [roomId]: list.filter((item) => item !== key),
        },
      })
      return
    }
    // Never let one person cover two rooms in the same slot.
    if (isBusyElsewhere(assignments, roomId, key)) return
    updateSeating({
      invigilatorAssignments: { ...assignments, [roomId]: [...list, key] },
    })
  }

return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold sm:text-lg">{t('invigilators.title')}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {t('invigilators.name')}
          </span>
          <input
            className={`${inputClass} w-full`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {t('invigilators.phone')}
          </span>
          <input
            className={`${inputClass} w-full`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {t('invigilators.department')}
          </span>
          <input
            className={`${inputClass} w-full`}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className={primaryClass}
            disabled={!name.trim()}
            onClick={handleAdd}
          >
            {t('invigilators.add')}
          </button>
        </div>
      </div>

      {invigilators.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">{t('invigilators.none')}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {invigilators.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
            >
              <span className="font-medium">{item.name || t('invigilators.unnamed')}</span>
              {item.department && (
                <span className="text-slate-500">{item.department}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-slate-400 hover:text-red-600"
                title={t('invigilators.remove')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {t('invigilators.perRoom')}
          </span>
          <input
            type="number"
            min="0"
            max="10"
            className={inputClass}
            value={seating.invigilatorsPerRoom}
            onChange={(event) =>
              updateSeating({ invigilatorsPerRoom: event.target.value })
            }
          />
        </label>
        <button
          type="button"
          className={buttonClass}
          disabled={invigilators.length === 0}
          onClick={handleAutoAssign}
        >
          {t('invigilators.autoAssign')}
        </button>
        <p className="text-sm text-slate-600">
          {t('invigilators.staffed')}{' '}
          {n(summary.rooms - summary.shortfalls.length)} / {n(summary.rooms)}
          {summary.shortfalls.length > 0 && (
            <span className="ml-1 text-amber-700">
              · {t('invigilators.short')} {n(summary.shortfalls.length)}
            </span>
          )}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {rooms.map((room) => (
          <li key={room.id} className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-sm font-medium">{room.name}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {invigilators.length === 0 ? (
                <span className="text-xs text-slate-400">
                  {t('invigilators.none')}
                </span>
              ) : (
                invigilators.map((item) => {
                  const here = (assignments[room.id] || []).includes(
                    String(item.id),
                  )
                  const busy =
                    !here && isBusyElsewhere(assignments, room.id, item.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(room.id, item.id)}
                      disabled={busy}
                      title={busy ? t('invigilators.busy') : item.name || t('invigilators.unnamed')}
                      className={
                        'rounded-md border px-2 py-1 text-xs transition ' +
                        (here
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50') +
                        (busy ? ' cursor-not-allowed opacity-40' : '')
                      }
                    >
                      {item.name || t('invigilators.unnamed')}
                    </button>
                  )
                })
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}