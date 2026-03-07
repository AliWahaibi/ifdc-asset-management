import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshAccessToken: () => Promise<string | null>;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.post('/auth/login', { email, password });
                    const { access_token, refresh_token, user } = response.data;
                    set({
                        user,
                        accessToken: access_token,
                        refreshToken: refresh_token,
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
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            refreshAccessToken: async () => {
                const { refreshToken } = get();
                if (!refreshToken) {
                    get().logout();
                    return null;
                }
                try {
                    const response = await apiClient.post('/auth/refresh', {
                        refresh_token: refreshToken,
                    });
                    const { access_token } = response.data;
                    set({ accessToken: access_token });
                    return access_token;
                } catch {
                    get().logout();
                    return null;
                }
            },

            setTokens: (accessToken: string, refreshToken: string) => {
                set({ accessToken, refreshToken, isAuthenticated: true });
            },

            setUser: (user: User) => {
                set({ user });
            },
        }),
        {
            name: 'ifdc-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
