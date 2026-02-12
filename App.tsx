import React, { useEffect, useState } from 'react';
import { OfferGenerator } from './components/OfferGenerator';
import { LoginScreen } from './components/LoginScreen';

const PASSWORD = 'Kefirbekon123';
const SESSION_KEY = 'starterhome_auth';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === 'ok';
    setIsAuthenticated(ok);
  }, []);

  const handleLogin = (password: string) => {
    if (password === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setIsAuthenticated(false);
      setLoginError('Nieprawidłowe hasło.');
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} initialError={loginError} />;
  }

  return <OfferGenerator />;
};
