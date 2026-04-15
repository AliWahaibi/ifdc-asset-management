import { apiClient } from '@/lib/api';
import type { User, PaginatedResponse } from '@/types';

export const userService = {
    // Get paginated users
    getUsers: async (page = 1, limit = 10): Promise<PaginatedResponse<User>> => {
        const response = await apiClient.get<PaginatedResponse<User>>('/users', {
            params: { page, limit }
        });
        return response.data;
    },

    // Get a single user by ID
    getUser: async (id: string): Promise<User> => {
        const response = await apiClient.get<User>(`/users/${id}`);
        return response.data;
    },

    // Get current user's profile with assigned assets
    getProfile: async (): Promise<{ user: User, office_assets: any[] }> => {
        const response = await apiClient.get('/users/profile');
        return response.data;
    },

    // Create a new user (with file upload support)
    createUser: async (data: FormData): Promise<User> => {
        const response = await apiClient.post<User>('/users', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Update an existing user (with file upload support)
    updateUser: async (id: string, data: FormData): Promise<User> => {
        const response = await apiClient.put<User>(`/users/${id}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Delete a user
    deleteUser: async (id: string): Promise<void> => {
        await apiClient.delete(`/users/${id}`);
    },

    // Update user status (active/suspended)
    updateUserStatus: async (id: string, status: string): Promise<void> => {
        await apiClient.patch(`/users/${id}/status`, { status });
    },
};
