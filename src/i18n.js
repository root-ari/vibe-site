import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react'

export const translations = {
  en: {
    'app.title': 'Exam Seat Plan',
    'app.subtitle': 'Automatic room seating',
    'lang.switchTo': 'বাংলা',
    'lang.en': 'English',
    'lang.bn': 'বাংলা',
    'nav.setup': 'Setup',
    'nav.plan': 'Seat Plan',
    'nav.search': 'Search',
    'page.setup.title': 'Setup',
    'page.setup.text': 'Paste rooms and students here, then generate the seat plan.',
    'page.plan.title': 'Seat Plan',
    'page.plan.text': 'Each room will be shown as a grid, with broken seats greyed out.',
    'page.search.title': 'Search',
    'page.search.text': 'Look up a student ID to see their room and seat.',
    'page.comingSoon': 'Coming soon',
    'footer.note': 'Data is stored only in your browser (localStorage).',
    'data.rooms': 'Rooms',
    'data.students': 'Students',
    'reset.button': 'Reset sample data',
    'reset.confirm':
      'Reset all rooms and students back to the sample data? This cannot be undone.',
    'reset.confirmYes': 'Yes, reset',
    'reset.confirmNo': 'Cancel',

    // Setup page
    'setup.institution.title': 'Institution',
    'setup.institution.name': 'Institution name',
    'setup.institution.logo': 'Institution logo',
    'setup.institution.logoChoose': 'Choose logo',
    'setup.institution.logoRemove': 'Remove logo',
    'setup.institution.language': 'App language',
    'setup.exam.title': 'Exam',
    'setup.exam.id': 'Exam ID',
    'setup.exam.name': 'Title',
    'setup.exam.date': 'Date',
    'setup.exam.start': 'Start time',
    'setup.exam.end': 'End time',
    'setup.rooms.title': 'Rooms',
    'setup.rooms.size': 'Size',
    'setup.rooms.bench': 'Seats per bench',
    'setup.rooms.broken': 'Broken',
    'setup.backup.title': 'Backup',
    'setup.backup.export': 'Export backup (JSON)',
    'setup.backup.import': 'Import backup',
    'setup.backup.hint':
      'All data lives in this browser only. Export a backup before clearing browser data.',

    // Shared
    'common.none': 'None',
    'data.seats': 'Usable seats',
    'reset.done': 'Sample data restored.',

    // Import / logo errors
    'import.ok': 'Backup imported successfully.',
    'import.error.bad-json': 'That file is not valid JSON.',
    'import.error.not-object': 'That file is not a seat plan backup.',
    'import.error.bad-version':
      'This backup was created by a newer version of the app.',
    'import.error.too-large': 'That file is too large (limit 5 MB).',
    'import.error.read': 'The file could not be read.',
    'logo.error.not-image': 'Please choose an image file.',
    'logo.error.too-large': 'Logo is too large (limit 150 KB).',
    'logo.error.read': 'The image could not be read.',
  },
  bn: {
    'app.title': 'পরীক্ষার সিট প্ল্যান',
    'app.subtitle': 'স্বয়ংক্রিয় কক্ষ বিন্যাস',
    'lang.switchTo': 'English',
    'lang.en': 'English',
    'lang.bn': 'বাংলা',
    'nav.setup': 'সেটআপ',
    'nav.plan': 'সিট প্ল্যান',
    'nav.search': 'খোঁজ',
    'page.setup.title': 'সেটআপ',
    'page.setup.text': 'এখানে কক্ষ ও শিক্ষার্থীদের তথ্য পেস্ট করুন, তারপর সিট প্ল্যান তৈরি করুন।',
    'page.plan.title': 'সিট প্ল্যান',
    'page.plan.text': 'প্রতিটি কক্ষ গ্রিড আকারে দেখানো হবে, নষ্ট সিট ধূসর রঙে থাকবে।',
    'page.search.title': 'শিক্ষার্থী খোঁজ',
    'page.search.text': 'আইডি দিয়ে শিক্ষার্থীর কক্ষ ও সিট দেখুন।',
    'page.comingSoon': 'শীঘ্রই আসছে',
    'footer.note': 'ডেটা শুধু আপনার ব্রাউজারে (localStorage) সংরক্ষিত থাকে।',
    'data.rooms': 'কক্ষ',
    'data.students': 'শিক্ষার্থী',
    'reset.button': 'নমুনা ডেটা রিসেট',
    'reset.confirm': 'সব কক্ষ ও শিক্ষার্থীকে নমুনা ডেটায় ফিরিয়ে নিতে চান? এটি ফিরিয়ে আনা যাবে না।',
    'reset.confirmYes': 'হ্যাঁ, রিসেট করুন',
    'reset.confirmNo': 'বাতিল',

    // Setup page
    'setup.institution.title': 'প্রতিষ্ঠান',
    'setup.institution.name': 'প্রতিষ্ঠানের নাম',
    'setup.institution.logo': 'প্রতিষ্ঠানের লোগো',
    'setup.institution.logoChoose': 'লোগো নির্বাচন করুন',
    'setup.institution.logoRemove': 'লোগো সরান',
    'setup.institution.language': 'অ্যাপের ভাষা',
    'setup.exam.title': 'পরীক্ষা',
    'setup.exam.id': 'পরীক্ষা আইডি',
    'setup.exam.name': 'শিরোনাম',
    'setup.exam.date': 'তারিখ',
    'setup.exam.start': 'শুরুর সময়',
    'setup.exam.end': 'শেষের সময়',
    'setup.rooms.title': 'কক্ষসমূহ',
    'setup.rooms.size': 'আকার',
    'setup.rooms.bench': 'বেঞ্চে আসন',
    'setup.rooms.broken': 'নষ্ট',
    'setup.backup.title': 'ব্যাকআপ',
    'setup.backup.export': 'ব্যাকআপ এক্সপোর্ট (JSON)',
    'setup.backup.import': 'ব্যাকআপ ইমপোর্ট',
    'setup.backup.hint':
      'সব ডেটা শুধু এই ব্রাউজারে থাকে। ব্রাউজারের ডেটা মুছে ফেলার আগে ব্যাকআপ নিন।',

    // Shared
    'common.none': 'নেই',
    'data.seats': 'ব্যবহারযোগ্য আসন',
    'reset.done': 'নমুনা ডেটা পুনরুদ্ধার হয়েছে।',

    // Import / logo errors
    'import.ok': 'ব্যাকআপ সফলভাবে আমদানি হয়েছে।',
    'import.error.bad-json': 'ফাইলটি বৈধ JSON নয়।',
    'import.error.not-object': 'ফাইলটি সিট প্ল্যান ব্যাকআপ নয়।',
    'import.error.bad-version': 'এই ব্যাকআপটি অ্যাপের নতুন সংস্করণে তৈরি হয়েছে।',
    'import.error.too-large': 'ফাইলটি অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।',
    'import.error.read': 'ফাইলটি পড়া যায়নি।',
    'logo.error.not-image': 'একটি ছবির ফাইল নির্বাচন করুন।',
    'logo.error.too-large': 'লোগো অনেক বড় (সর্বোচ্চ ১৫০ কিলোবাইট)।',
    'logo.error.read': 'ছবিটি পড়া যায়নি।',
  },
}

const STORAGE_KEY = 'seatplan.lang'

const LangContext = createContext(null)

function readSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'bn') return saved
  } catch {
    // ignore storage errors (private mode, disabled storage)
  }
  return 'en'
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readSavedLang)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = lang
  }, [lang])

  const t = (key) => translations[lang][key] ?? translations.en[key] ?? key
  const toggle = () => setLang((current) => (current === 'en' ? 'bn' : 'en'))

  const value = { lang, setLang, toggle, t }
  return createElement(LangContext.Provider, { value }, children)
}

export function useLang() {
  const context = useContext(LangContext)
  if (!context) {
    throw new Error('useLang must be used inside <LangProvider>')
  }
  return context
}
