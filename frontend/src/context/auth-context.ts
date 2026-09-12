import { createContext } from 'react';
import type { AuthUser, RegistrationInput } from '../services/auth';

type Credentials = { email: string; password: string };
type AuthStatus = 'checking' | 'guest' | 'authenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: Credentials) => Promise<AuthUser>;
  register: (input: RegistrationInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
