import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

interface NetworkState {
  isServerReachable: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  setServerReachable: (reachable: boolean) => void;
  checkHealth: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isServerReachable: true,
  isChecking: false,
  lastChecked: null,

  setServerReachable: (reachable: boolean) =>
    set({ isServerReachable: reachable, lastChecked: new Date() }),

  checkHealth: async () => {
    set({ isChecking: true });
    try {
      // Direct timeout check to backend health endpoint
      const rootUrl = API_BASE_URL.replace('/api/v1', '');
      const healthUrl = `${rootUrl}/health`;
      await axios.get(healthUrl, { timeout: 4000 });
      set({ isServerReachable: true, isChecking: false, lastChecked: new Date() });
      return true;
    } catch {
      set({ isServerReachable: false, isChecking: false, lastChecked: new Date() });
      return false;
    }
  },
}));
