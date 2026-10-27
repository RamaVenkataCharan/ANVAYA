import { create } from 'zustand';
import {
  Role,
  VerificationStatus,
  AuthenticatedUser,
  AuthResponse,
} from '@anvaya/shared';
import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
  STORAGE_KEYS,
} from '../services/storage';
import { api } from '../services/api';

export function extractVerificationStatus(
  user: AuthenticatedUser | null
): VerificationStatus | null {
  if (!user) return null;
  if (user.role === Role.DOCTOR) {
    return user.doctorProfile?.verificationStatus ?? VerificationStatus.PENDING;
  }
  if (user.role === Role.SHOP) {
    return user.shopProfile?.verificationStatus ?? VerificationStatus.PENDING;
  }
  return VerificationStatus.APPROVED;
}

export interface AuthState {
  user: AuthenticatedUser | null;
  role: Role | null;
  verificationStatus: VerificationStatus | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  setTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  setUser: (user: AuthenticatedUser | null) => void;
  login: (authData: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshMe: () => Promise<AuthenticatedUser | null>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  verificationStatus: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true, // starts true to allow restoring session splash/loading state
  error: null,

  setTokens: async ({ accessToken, refreshToken }) => {
    await setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: (user: AuthenticatedUser | null) => {
    const role = user?.role ?? null;
    const verificationStatus = extractVerificationStatus(user);
    set({ user, role, verificationStatus });
  },

  login: async (authData: AuthResponse) => {
    const { user, tokens } = authData;
    const verificationStatus = extractVerificationStatus(user);

    await setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(user));

    set({
      user,
      role: user.role,
      verificationStatus,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isLoading: false,
      error: null,
    });
  },

  logout: async () => {
    const currentRefreshToken = get().refreshToken;

    // Optional server notification of logout
    if (currentRefreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken: currentRefreshToken });
      } catch {
        // Ignore network failure when logging out
      }
    }

    await deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
    await deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
    await deleteSecureItem(STORAGE_KEYS.USER);

    set({
      user: null,
      role: null,
      verificationStatus: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  },

  restoreSession: async () => {
    set({ isLoading: true, error: null });

    try {
      const accessToken = await getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
      const cachedUserJson = await getSecureItem(STORAGE_KEYS.USER);

      if (!accessToken || !refreshToken) {
        set({
          user: null,
          role: null,
          verificationStatus: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
        });
        return;
      }

      let parsedUser: AuthenticatedUser | null = null;
      if (cachedUserJson) {
        try {
          parsedUser = JSON.parse(cachedUserJson);
        } catch {
          // ignore corrupted JSON
        }
      }

      // Populate store with stored credentials so requests work
      set({
        accessToken,
        refreshToken,
        user: parsedUser,
        role: parsedUser?.role ?? null,
        verificationStatus: extractVerificationStatus(parsedUser),
      });

      // Fetch fresh profile from server to ensure verification status & validity
      try {
        const response = await api.get('/auth/me');
        const freshUser: AuthenticatedUser = response.data?.data;

        if (freshUser) {
          await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
          const verificationStatus = extractVerificationStatus(freshUser);

          set({
            user: freshUser,
            role: freshUser.role,
            verificationStatus,
            isLoading: false,
          });
          return;
        }
      } catch (apiError: unknown) {
        const axiosErr = apiError as { response?: { status?: number } };
        // If the token was invalid/expired and refresh failed, logout was called
        if (axiosErr?.response?.status === 401) {
          set({ isLoading: false });
          return;
        }

        // If it was a network error (e.g. server offline), fallback to cached user
        if (parsedUser) {
          set({ isLoading: false });
          return;
        }
      }

      set({ isLoading: false });
    } catch (err: unknown) {
      console.warn('Failed to restore session:', err);
      set({
        user: null,
        role: null,
        verificationStatus: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
    }
  },

  refreshMe: async () => {
    try {
      const response = await api.get('/auth/me');
      const freshUser: AuthenticatedUser = response.data?.data;
      if (freshUser) {
        await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
        const verificationStatus = extractVerificationStatus(freshUser);
        set({
          user: freshUser,
          role: freshUser.role,
          verificationStatus,
        });
        return freshUser;
      }
    } catch (e) {
      console.warn('refreshMe error:', e);
    }
    return null;
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
