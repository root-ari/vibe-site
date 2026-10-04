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
  },
  bn: {
    'app.title': 'পরীক্ষার সিট প্ল্যান',
    'app.subtitle': 'স্বয়ংক্রিয় কক্ষ বিন্যাস',
    'lang.switchTo': 'English',
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
