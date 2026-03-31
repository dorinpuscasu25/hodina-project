import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import type { AuthResponse, BootstrapData, Guesthouse, UserProfile } from '@/lib/types';

const TOKEN_KEY = 'hodina.dashboard.token';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserProfile | null;
  guesthouse: Guesthouse | null;
  bootstrap: BootstrapData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchBootstrap(locale: string) {
  const response = await apiRequest<{ data: BootstrapData }>(`/public/bootstrap?locale=${locale}`);
  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [guesthouse, setGuesthouse] = useState<Guesthouse | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setGuesthouse(null);
    setBootstrap(null);
  };

  const refreshBootstrap = async () => {
    const locale = guesthouse?.locale ?? user?.locale ?? 'ro';
    const payload = await fetchBootstrap(locale);
    setBootstrap(payload);
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

      const payload = await fetchBootstrap(response.data.guesthouse?.locale ?? response.data.user.locale ?? 'ro');
      setBootstrap(payload);
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
    const response = await apiRequest<{ data: AuthResponse }>('/host/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    localStorage.setItem(TOKEN_KEY, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setGuesthouse(response.data.guesthouse);
    setBootstrap(
      await fetchBootstrap(response.data.guesthouse?.locale ?? response.data.user.locale ?? 'ro'),
    );
  };

  const logout = async () => {
    if (token) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token,
        });
      } catch {
        // ignore logout errors and clear local state anyway
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
        bootstrap,
        login,
        logout,
        refreshProfile,
        refreshBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
