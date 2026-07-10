// store/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setHydrated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,
      setUser: (user) => {
        console.log('🔧 Setting user in store:', user);
        set({ user });
      },
      setAuthenticated: (isAuthenticated) => {
        console.log('🔧 Setting authenticated in store:', isAuthenticated);
        set({ isAuthenticated });
      },
      setLoading: (isLoading) => {
        console.log('🔧 Setting loading:', isLoading);
        set({ isLoading });
      },
      setHydrated: (isHydrated) => {
        console.log('🔧 Setting hydrated:', isHydrated);
        set({ isHydrated });
      },
      logout: () => {
        console.log('🔧 Logging out from store');
        set({ user: null, isAuthenticated: false });
        // ✅ Clear localStorage
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('🔧 Rehydrating storage...');
        if (state) {
          state.setHydrated(true);
          state.setLoading(false);
          console.log('✅ Rehydrated state:', {
            user: state.user,
            isAuthenticated: state.isAuthenticated,
          });
        }
      },
    }
  )
);