import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Create a base Axios instance without interceptors (used for refresh calls)
// Explicitly set /api base URL to ensure requests are routed correctly through Nginx
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
    withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

// ===== Request Interceptor: Removed manual JWT attachment =====
// The browser now handles the 'jwt' cookie automatically via withCredentials: true
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        return config;
    },
    (error) => Promise.reject(error)
);

// ===== Response Interceptor: Handle 401 + Token Refresh =====
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Only attempt refresh on 401 and if we haven't already retried
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If the failed request was itself a refresh call, logout immediately
        if (originalRequest.url?.includes('/auth/refresh')) {
            useAuthStore.getState().logout();
            return Promise.reject(error);
        }

        // If already refreshing, queue this request
        if (isRefreshing) {
            return new Promise<string | null>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => {
                // No token needed in queue, browse handles cookies
                return apiClient(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await useAuthStore.getState().refreshAccessToken();
            // Cookies updated automatically
            processQueue(null, "success");
            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError as AxiosError);
            useAuthStore.getState().logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
