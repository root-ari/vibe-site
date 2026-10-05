import { Component } from 'react'
import { storedLang, translations } from './i18n.js'

/**
 * Catches render-time crashes anywhere below it, so a bug shows a bilingual
 * message with a Reload button instead of a blank white page.
 *
 * It reads the dictionary directly rather than through useLang(), because a
 * hook call inside a class is impossible and the provider may itself be the
 * thing that failed.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[app] render failed', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const table = translations[storedLang()] || translations.en
    const t = (key) => table[key] ?? translations.en[key] ?? key

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-red-700">{t('error.title')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('error.body')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {t('error.reload')}
          </button>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-slate-500">
              {t('error.details')}
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
              {String((error && (error.stack || error.message)) || error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}