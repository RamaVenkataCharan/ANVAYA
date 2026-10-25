import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth';

// EXPO_PUBLIC_API_URL should point to the backend root with /api/v1 prefix
// When using a physical phone or Expo Go, set EXPO_PUBLIC_API_URL to http://<YOUR_LAN_IP>:4000/api/v1
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Dedicated unintercepted client for token refresh to avoid recursive retry loops
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach bearer access token if present
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue to handle simultaneous requests failing on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: on 401 tries the refresh endpoint once, then logs out
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If there is no response or it's not a 401 error, or no request config, reject
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Never retry auth endpoints (login, register, refresh)
    const url = originalRequest.url || '';
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    // If this request was already retried once after refresh, log out immediately
    if (originalRequest._retry) {
      await useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // If another request is currently refreshing tokens, wait in the queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers && newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const currentRefreshToken = useAuthStore.getState().refreshToken;

    if (!currentRefreshToken) {
      isRefreshing = false;
      await useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    try {
      const response = await refreshClient.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      const data = response.data?.data;
      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;

      if (!newAccessToken || !newRefreshToken) {
        throw new Error('Malformed token response from refresh endpoint');
      }

      // Update tokens in zustand and SecureStore
      await useAuthStore.getState().setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      // Update authorization header on the original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null, newAccessToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed or token was revoked: log the user out
      await useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
