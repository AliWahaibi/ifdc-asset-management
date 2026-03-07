import { apiClient } from '@/lib/api';
import type { OfficeAsset, PaginatedResponse, AssetStatus, OfficeAssetCategory } from '@/types';

export interface CreateOfficeAssetData {
    name: string;
    category: OfficeAssetCategory;
    serial_number: string;
    status: AssetStatus;
    department_id: string | null;
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

    createAsset: async (data: CreateOfficeAssetData): Promise<OfficeAsset> => {
        const response = await apiClient.post<OfficeAsset>('/office/assets', data);
        return response.data;
    },

    updateAsset: async (id: string, data: UpdateOfficeAssetData): Promise<OfficeAsset> => {
        const response = await apiClient.put<OfficeAsset>(`/office/assets/${id}`, data);
        return response.data;
    },

    deleteAsset: async (id: string): Promise<void> => {
        await apiClient.delete(`/office/assets/${id}`);
    },
};
