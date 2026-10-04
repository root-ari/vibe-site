/**
 * Pure helpers for exam staffing: giving every room the same number of
 * invigilators while making sure nobody is booked into two rooms at once.
 * No React, no storage.
 */

export function normalizeInvigilator(raw, index) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const id = String(source.id ?? '').trim()
  const name = String(source.name ?? '').trim()
  return {
    id: id || `inv-${index + 1}`,
    name: name || `Invigilator ${index + 1}`,
    phone: String(source.phone ?? '').trim(),
    department: String(source.department ?? '').trim(),
  }
}

export function uniqueInvigilators(list) {
  const used = new Set()
  const out = []
  list.forEach((invigilator, index) => {
    let id = invigilator.id || `inv-${index + 1}`
    while (used.has(id)) id = `${id}-${index + 1}`
    used.add(id)
    out.push({ ...invigilator, id })
  })
  return out
}

/**
 * Greedy staffing. Manual bookings that are still valid are kept, then every
 * room is topped up from the remaining pool. `busy` spans the whole run, so an
 * invigilator can only ever appear in one room.
 */
export function autoAssignInvigilators({
  rooms = [],
  invigilators = [],
  perRoom = 1,
  existing = {},
} = {}) {
  const want = Math.max(0, Math.trunc(Number(perRoom)) || 0)
  const pool = (invigilators || []).map((item) => String(item.id))
  const result = {}
  const busy = new Set()

  for (const room of rooms) {
    const kept = []
    for (const id of (existing && existing[room.id]) || []) {
      const key = String(id)
      if (pool.includes(key) && !busy.has(key)) {
        kept.push(key)
        busy.add(key)
      }
    }
    result[room.id] = kept
  }

  let cursor = 0
  for (const room of rooms) {
    const need = want - result[room.id].length
    for (let i = 0; i < need; i += 1) {
      let picked = null
      for (let step = 0; step < pool.length; step += 1) {
        const candidate = pool[(cursor + step) % pool.length]
        if (!busy.has(candidate)) {
          picked = candidate
          cursor = (cursor + step + 1) % pool.length
          break
        }
      }
      // out of invigilators: leave this room short rather than double booking
      if (!picked) break
      busy.add(picked)
      result[room.id].push(picked)
    }
  }
  return result
}

// Rooms that could not be fully staffed.
export function staffingShortfalls({ rooms = [], assignments = {}, perRoom = 1 } = {}) {
  const want = Math.max(0, Math.trunc(Number(perRoom)) || 0)
  return rooms
    .map((room) => ({
      roomId: room.id,
      roomName: room.name,
      missing: want - ((assignments[room.id] || []).length || 0),
    }))
    .filter((item) => item.missing > 0)
}

export function staffingSummary({ rooms = [], assignments = {}, perRoom = 1 } = {}) {
  const want = Math.max(0, Math.trunc(Number(perRoom)) || 0)
  const needed = rooms.length * want
  let assigned = 0
  const seen = new Set()
  for (const room of rooms) {
    for (const id of assignments[room.id] || []) {
      // counted once per person: nobody is counted for two rooms
      if (!seen.has(String(id))) {
        seen.add(String(id))
        assigned += 1
      }
    }
  }
  const booked = rooms.reduce(
    (sum, room) => sum + (assignments[room.id] || []).length,
    0,
  )
  return { rooms: rooms.length, perRoom: want, needed, booked, people: assigned, shortfalls: staffingShortfalls({ rooms, assignments, perRoom }) }
}

export function isBusyElsewhere(assignments, roomId, invigilatorId) {
  const key = String(invigilatorId)
  for (const [id, list] of Object.entries(assignments || {})) {
    if (String(id) === String(roomId)) continue
    if ((list || []).some((item) => String(item) === key)) return true
  }
  return false
}