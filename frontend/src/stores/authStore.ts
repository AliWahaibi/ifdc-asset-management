import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshAccessToken: () => Promise<void>;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.post('/auth/login', { email, password });
                    const { user } = response.data;
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                });
                // Note: The actual cookie clearing should happen on the backend or via document.cookie if not HttpOnly
                // But since we use HttpOnly, the backend must clear it on a logout endpoint.
                // For now, we clear the local state.
            },

            refreshAccessToken: async () => {
                try {
                    await apiClient.post('/auth/refresh');
                    // Cookie is updated automatically by the browser
                } catch {
                    get().logout();
                }
            },

            setUser: (user: User) => {
                set({ user });
            },
        }),
        {
            name: 'ifdc-auth',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
