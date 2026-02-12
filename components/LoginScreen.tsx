import React, { useMemo, useState } from 'react'

interface LoginScreenProps {
  onSuccess: () => void
  appName?: string
  logoUrl?: string
}

const PASSWORD = 'Kefirbekon123'

export default function LoginScreen({
  onSuccess,
  appName = 'Panel Handlowca',
  logoUrl,
}: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => password.trim().length > 0 && !submitting, [password, submitting])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // tiny delay for nicer UX
    window.setTimeout(() => {
      if (password === PASSWORD) {
        onSuccess()
      } else {
        setError('Nieprawidłowe hasło. Spróbuj ponownie.')
        setSubmitting(false)
      }
    }, 150)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-200 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center text-white font-semibold">
                  SH
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">{appName}</div>
                <div className="text-xl font-semibold text-gray-900">Zaloguj się</div>
              </div>
            </div>

            <p className="mt-6 text-sm text-gray-600">
              Wpisz hasło, aby uzyskać dostęp do generatora ofert.
            </p>

            <form className="mt-6" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700">Hasło</label>
              <div className="mt-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
                  placeholder="Wpisz hasło"
                />
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 text-white font-semibold shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sprawdzanie…' : 'Zaloguj'}
              </button>
            </form>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Dostęp chroniony hasłem. Po odświeżeniu strony będzie wymagane ponowne logowanie.
          </div>
        </div>
      </div>
    </div>
  )
}
