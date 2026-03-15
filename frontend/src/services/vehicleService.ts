import { apiClient } from '@/lib/api';
import type { PaginatedResponse, AssetStatus } from '@/types';

export interface VehicleAsset extends CreateVehicleAssetData {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface CreateVehicleAssetData {
    name: string;
    license_plate: string;
    status: AssetStatus;
    department_id: string | null;
    mileage: number;
    notes: string;
}

export type UpdateVehicleAssetData = Partial<CreateVehicleAssetData>;

export const vehicleService = {
    getAssets: async (page = 1, limit = 10, search?: string): Promise<PaginatedResponse<VehicleAsset>> => {
        const response = await apiClient.get<PaginatedResponse<VehicleAsset>>('/vehicles/assets', {
            params: { page, limit, search }
        });
        return response.data;
    },

    getAsset: async (id: string): Promise<VehicleAsset> => {
        const response = await apiClient.get<VehicleAsset>(`/vehicles/assets/${id}`);
        return response.data;
    },

    createAsset: async (data: CreateVehicleAssetData): Promise<VehicleAsset> => {
        const response = await apiClient.post<VehicleAsset>('/vehicles/assets', data);
        return response.data;
    },

    updateAsset: async (id: string, data: UpdateVehicleAssetData): Promise<VehicleAsset> => {
        const response = await apiClient.put<VehicleAsset>(`/vehicles/assets/${id}`, data);
        return response.data;
    },

    deleteAsset: async (id: string): Promise<void> => {
        await apiClient.delete(`/vehicles/assets/${id}`);
    },
};
