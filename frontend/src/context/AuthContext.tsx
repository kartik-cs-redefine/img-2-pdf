import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from '../services/auth';
import { AuthContext, type AuthContextValue } from './auth-context';

type AuthStatus = 'checking' | 'guest' | 'authenticated';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;

    void authApi.me()
      .then(({ user: authenticatedUser }) => {
        if (!active) return;
        setUser(authenticatedUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('guest');
      });

    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    async login(input) {
      const response = await authApi.login(input);
      setUser(response.user);
      setStatus('authenticated');
      return response.user;
    },
    async register(input) {
      const response = await authApi.register(input);
      setUser(response.user);
      setStatus('authenticated');
      return response.user;
    },
    async logout() {
      await authApi.logout();
      setUser(null);
      setStatus('guest');
    },
  }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
