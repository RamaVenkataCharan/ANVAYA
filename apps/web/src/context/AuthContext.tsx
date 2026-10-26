import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthenticatedUser, Role } from '@anvaya/shared';
import {
  api,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
  registerTokenExpiryHandler,
} from '../lib/api';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
      }
    } catch {
      setUser(null);
      clearTokens();
    }
  }, []);

  // Silent session restoration on app boot via refresh flow
  useEffect(() => {
    const initAuth = async () => {
      const existingRefreshToken = getRefreshToken();
      if (!existingRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.post('/auth/refresh', {
          refreshToken: existingRefreshToken,
        });

        if (response.data?.success && response.data?.data) {
          const tokens = response.data.data.tokens || response.data.data;
          const { accessToken, refreshToken } = tokens;
          setAccessToken(accessToken);
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }
          await fetchCurrentUser();
        }
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    registerTokenExpiryHandler(() => {
      setUser(null);
    });

    initAuth();
  }, [fetchCurrentUser]);

  const login = async (identifier: string, password: string): Promise<AuthenticatedUser> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });

      const { user: loggedInUser, tokens } = response.data.data;

      // Access token stays in-memory ONLY
      setAccessToken(tokens.accessToken);
      // Refresh token kept for silent renewal across tabs/sessions
      setRefreshToken(tokens.refreshToken);

      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
