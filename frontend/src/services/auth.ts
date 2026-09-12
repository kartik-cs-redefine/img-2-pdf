export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type AuthResponse = {
  user: AuthUser;
};

type Credentials = {
  email: string;
  password: string;
};

export type RegistrationInput = Credentials & {
  name: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');

async function requestAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/auth${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'Authentication request failed.';
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const authApi = {
  register(input: RegistrationInput) {
    return requestAuth<AuthResponse>('/register', { method: 'POST', body: JSON.stringify(input) });
  },
  login(input: Credentials) {
    return requestAuth<AuthResponse>('/login', { method: 'POST', body: JSON.stringify(input) });
  },
  me() {
    return requestAuth<AuthResponse>('/me');
  },
  async logout() {
    await requestAuth<void>('/logout', { method: 'POST' });
  },
};
