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
});

// ===== Request Interceptor: Attach JWT =====
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
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
            }).then((token) => {
                if (token && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return apiClient(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const newToken = await useAuthStore.getState().refreshAccessToken();
            if (!newToken) {
                // If refresh store method fails to get a token, clear queue and throw
                processQueue(new axios.Cancel('Refresh token generation failed') as unknown as AxiosError);
                // Hard reset
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            processQueue(null, newToken);

            if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                // Set the token instantly in the store (this is already handled inside refreshAccessToken)
                // c. Return the retried request
                return apiClient(originalRequest);
            }
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
