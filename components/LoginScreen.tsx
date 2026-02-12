import React, { useMemo, useState } from 'react';

type Props = {
  onLogin: (password: string) => void;
  initialError?: string | null;
};

export const LoginScreen: React.FC<Props> = ({ onLogin, initialError = null }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);

  const year = useMemo(() => new Date().getFullYear(), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Wpisz hasło.');
      return;
    }
    onLogin(password);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-white text-xl font-semibold leading-tight">Starter Home</div>
                <div className="text-white/70 text-sm">Generator oferty • Panel admina</div>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-white text-lg font-semibold">Zaloguj się</div>
              <div className="text-white/70 text-sm mt-1">Wpisz hasło, aby uzyskać dostęp do konfiguratora.</div>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Hasło</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
                  placeholder="Wpisz hasło"
                  autoFocus
                />
                {error && (
                  <div className="mt-2 text-sm text-rose-200">{error}</div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-white text-emerald-900 font-semibold py-3 hover:bg-white/90 active:bg-white/80 transition"
              >
                Wejdź do konfiguratora
              </button>

              <div className="text-xs text-white/60 text-center pt-2">
                © {year} Starter Home
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-4 text-white/60 text-xs">
          Dostęp tylko dla osób uprawnionych.
        </div>
      </div>
    </div>
  );
};
