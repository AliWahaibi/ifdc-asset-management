import { apiClient } from '@/lib/api';
import type { RndAsset, PaginatedResponse, AssetStatus, RndAssetType } from '@/types';

export interface CreateRndAssetData {
    name: string;
    asset_type: RndAssetType;
    serial_number: string;
    status: AssetStatus;
    department_id: string | null;
    specifications: Record<string, unknown>;
    is_classified: boolean;
    notes: string;
}

export type UpdateRndAssetData = Partial<CreateRndAssetData>;

export const rndService = {
    getAssets: async (page = 1, limit = 10, search?: string): Promise<PaginatedResponse<RndAsset>> => {
        const response = await apiClient.get<PaginatedResponse<RndAsset>>('/rnd/assets', {
            params: { page, limit, search }
        });
        return response.data;
    },

    getAsset: async (id: string): Promise<RndAsset> => {
        const response = await apiClient.get<RndAsset>(`/rnd/assets/${id}`);
        return response.data;
    },

    createAsset: async (data: CreateRndAssetData): Promise<RndAsset> => {
        const response = await apiClient.post<RndAsset>('/rnd/assets', data);
        return response.data;
    },

    updateAsset: async (id: string, data: UpdateRndAssetData): Promise<RndAsset> => {
        const response = await apiClient.put<RndAsset>(`/rnd/assets/${id}`, data);
        return response.data;
    },

    deleteAsset: async (id: string): Promise<void> => {
        await apiClient.delete(`/rnd/assets/${id}`);
    },
};
