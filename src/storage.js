// Persistent storage for the two core entities: rooms and students.
// Everything lives in localStorage - there is no backend.

const ROOMS_KEY = 'seatplan.rooms'
const STUDENTS_KEY = 'seatplan.students'

// Sample data used to seed the app on first load and by "Reset sample data".
export const DEFAULT_ROOMS = [
  { name: 'A-101', rows: 4, cols: 3, broken: [] },
  { name: 'A-102', rows: 3, cols: 3, broken: [] },
  { name: 'A-103', rows: 2, cols: 2, broken: [[1, 2]] },
]

export const DEFAULT_STUDENTS = [
  { id: '241-15-1001', name: 'Rahim Uddin', course: 'CSE221' },
  { id: '241-15-1002', name: 'Nusrat Jahan', course: 'CSE221' },
  { id: '241-15-1003', name: 'Tanvir Ahmed', course: 'CSE221' },
  { id: '241-15-1004', name: 'Mim Akter', course: 'CSE221' },
  { id: '241-15-1005', name: 'Sabbir Hossain', course: 'CSE221' },
  { id: '241-15-1006', name: 'Farhana Islam', course: 'CSE221' },
  { id: '241-15-1007', name: 'Imran Khan', course: 'CSE221' },
  { id: '241-15-1008', name: 'Sadia Rahman', course: 'CSE221' },
  { id: '241-15-1009', name: 'Arif Mahmud', course: 'CSE221' },
  { id: '241-15-1010', name: 'Tasnim Akter', course: 'CSE221' },
  { id: '241-16-2001', name: 'Kamrul Hasan', course: 'MAT201' },
  { id: '241-16-2002', name: 'Lamia Sultana', course: 'MAT201' },
  { id: '241-16-2003', name: 'Nahid Hasan', course: 'MAT201' },
  { id: '241-16-2004', name: 'Priya Das', course: 'MAT201' },
  { id: '241-16-2005', name: 'Shakib Al Amin', course: 'MAT201' },
  { id: '241-16-2006', name: 'Mou Chowdhury', course: 'MAT201' },
  { id: '241-16-2007', name: 'Rafiq Islam', course: 'MAT201' },
  { id: '241-16-2008', name: 'Tuli Begum', course: 'MAT201' },
  { id: '241-16-2009', name: 'Fahim Reza', course: 'MAT201' },
  { id: '241-17-3001', name: 'Anika Tabassum', course: 'ENG101' },
  { id: '241-17-3002', name: 'Sourav Paul', course: 'ENG101' },
  { id: '241-17-3003', name: 'Habiba Khatun', course: 'ENG101' },
  { id: '241-17-3004', name: 'Zahid Hasan', course: 'ENG101' },
  { id: '241-17-3005', name: 'Ritu Parvin', course: 'ENG101' },
  { id: '241-17-3006', name: 'Mehedi Hasan', course: 'ENG101' },
  { id: '241-17-3007', name: 'Oishi Roy', course: 'ENG101' },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return clone(fallback)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : clone(fallback)
  } catch {
    return clone(fallback)
  }
}

function writeArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadRooms() {
  return readArray(ROOMS_KEY, DEFAULT_ROOMS)
}

export function saveRooms(rooms) {
  return writeArray(ROOMS_KEY, rooms)
}

export function loadStudents() {
  return readArray(STUDENTS_KEY, DEFAULT_STUDENTS)
}

export function saveStudents(students) {
  return writeArray(STUDENTS_KEY, students)
}

export function loadData() {
  return { rooms: loadRooms(), students: loadStudents() }
}

export function saveData({ rooms, students }) {
  saveRooms(rooms)
  saveStudents(students)
}

// Restore both entities to the built-in sample data and return fresh copies.
export function resetData() {
  const rooms = clone(DEFAULT_ROOMS)
  const students = clone(DEFAULT_STUDENTS)
  saveRooms(rooms)
  saveStudents(students)
  return { rooms, students }
}
