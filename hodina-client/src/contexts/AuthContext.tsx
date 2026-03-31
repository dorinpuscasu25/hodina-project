import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';
import type { AuthPayload, Guesthouse, Language, UserProfile } from '../types';

const TOKEN_KEY = 'hodina.client.token';

interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  locale?: Language;
  timezone?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserProfile | null;
  guesthouse: Guesthouse | null;
  login: (email: string, password: string) => Promise<AuthPayload>;
  register: (payload: RegisterPayload) => Promise<AuthPayload>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [guesthouse, setGuesthouse] = useState<Guesthouse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setGuesthouse(null);
  };

  const refreshProfile = async (accessToken = token) => {
    if (!accessToken) {
      clearAuth();
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest<{ data: { user: UserProfile; guesthouse: Guesthouse | null } }>(
        '/auth/me',
        { token: accessToken },
      );

      setUser(response.data.user);
      setGuesthouse(response.data.guesthouse);
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void refreshProfile(token);
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<{ data: AuthPayload }>('/client/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    localStorage.setItem(TOKEN_KEY, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setGuesthouse(response.data.guesthouse);

    return response.data;
  };

  const register = async (payload: RegisterPayload) => {
    const response = await apiRequest<{ data: AuthPayload }>('/client/auth/register', {
      method: 'POST',
      body: payload as unknown as Record<string, unknown>,
    });

    localStorage.setItem(TOKEN_KEY, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setGuesthouse(response.data.guesthouse);

    return response.data;
  };

  const resendVerification = async () => {
    await apiRequest('/auth/email/resend', {
      method: 'POST',
      token,
    });
  };

  const logout = async () => {
    if (token) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token,
        });
      } catch {
        // ignore logout errors
      }
    }

    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token && user),
        isLoading,
        token,
        user,
        guesthouse,
        login,
        register,
        logout,
        refreshProfile: async () => refreshProfile(),
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
