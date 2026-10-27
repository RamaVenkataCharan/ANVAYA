import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

const MIN_COOLDOWN_MS = 3000; // Cooldown between health checks to avoid hammering /health
const BASE_BACKOFF_SECONDS = 5;
const MAX_BACKOFF_SECONDS = 30;

interface NetworkState {
  isServerReachable: boolean;
  isChecking: boolean;
  lastCheckedMs: number;
  backoffAttempt: number;
  setServerReachable: (reachable: boolean) => void;
  getNextBackoffSeconds: () => number;
  checkHealth: (force?: boolean) => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isServerReachable: true,
  isChecking: false,
  lastCheckedMs: 0,
  backoffAttempt: 0,

  setServerReachable: (reachable: boolean) => {
    set((state) => ({
      isServerReachable: reachable,
      lastCheckedMs: Date.now(),
      backoffAttempt: reachable ? 0 : state.backoffAttempt,
    }));
  },

  getNextBackoffSeconds: () => {
    const attempt = get().backoffAttempt;
    const backoff = BASE_BACKOFF_SECONDS * Math.pow(1.5, Math.min(attempt, 4));
    return Math.min(Math.round(backoff), MAX_BACKOFF_SECONDS);
  },

  checkHealth: async (force = false) => {
    const now = Date.now();
    const { isChecking, lastCheckedMs, isServerReachable, backoffAttempt } = get();

    // Prevent concurrent requests or hammering within 3s cooldown unless forced
    if (isChecking) return isServerReachable;
    if (!force && now - lastCheckedMs < MIN_COOLDOWN_MS) {
      return isServerReachable;
    }

    set({ isChecking: true, lastCheckedMs: now });

    try {
      const rootUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${rootUrl}/health`;
      const res = await axios.get(healthUrl, { timeout: 4000 });

      const isOk = res.status >= 200 && res.status < 400;
      set({
        isServerReachable: isOk,
        isChecking: false,
        backoffAttempt: 0,
        lastCheckedMs: Date.now(),
      });
      return isOk;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      // If server responded with 429 Too Many Requests, the server IS reachable,
      // but we must back off immediately to avoid further rate limiting
      if (axiosErr.response?.status === 429) {
        set({
          isServerReachable: true,
          isChecking: false,
          backoffAttempt: Math.min(backoffAttempt + 1, 6),
          lastCheckedMs: Date.now(),
        });
        return true;
      }

      set({
        isServerReachable: false,
        isChecking: false,
        backoffAttempt: backoffAttempt + 1,
        lastCheckedMs: Date.now(),
      });
      return false;
    }
  },
}));
