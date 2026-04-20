import { apiClient } from '@/lib/api';
import type { OfficeAsset, PaginatedResponse } from '@/types';

export interface CreateOfficeAssetData {
    name: string;
    category: string;
    serial_number: string;
    status: string;
    department_id: string | null;
    user_id: string | null;
    assigned_to: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    notes: string;
}

export type UpdateOfficeAssetData = Partial<CreateOfficeAssetData>;

export const officeService = {
    getAssets: async (page = 1, limit = 10, search?: string): Promise<PaginatedResponse<OfficeAsset>> => {
        const response = await apiClient.get<PaginatedResponse<OfficeAsset>>('/office/assets', {
            params: { page, limit, search }
        });
        return response.data;
    },

    getAsset: async (id: string): Promise<OfficeAsset> => {
        const response = await apiClient.get<OfficeAsset>(`/office/assets/${id}`);
        return response.data;
    },

    createAsset: async (data: FormData): Promise<OfficeAsset> => {
        const response = await apiClient.post<OfficeAsset>('/office/assets', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    updateAsset: async (id: string, data: FormData): Promise<OfficeAsset> => {
        const response = await apiClient.put<OfficeAsset>(`/office/assets/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteAsset: async (id: string): Promise<void> => {
        await apiClient.delete(`/office/assets/${id}`);
    },

    deleteImage: async (id: string): Promise<void> => {
        await apiClient.delete(`/office/assets/${id}/image`);
    },
    getCategories: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/office/categories');
        return response.data;
    },
};
