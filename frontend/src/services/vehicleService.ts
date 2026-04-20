import { apiClient } from '@/lib/api';
import type { PaginatedResponse, AssetStatus } from '@/types';

export interface VehicleImage {
    id: string;
    vehicle_asset_id: string;
    image_url: string;
    created_at: string;
}

export interface VehicleAsset extends CreateVehicleAssetData {
    id: string;
    inspection_images?: VehicleImage[];
    created_at: string;
    updated_at: string;
}

export interface CreateVehicleAssetData {
    name: string;
    license_plate: string;
    reference_number?: string;
    status: AssetStatus;
    department_id: string | null;
    mileage: number;
    rent_start_date?: string;
    rent_end_date?: string;
    mulkiya_expiry_date?: string;
    mulkiya_image_url?: string;
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

    createVehicle: async (data: FormData): Promise<VehicleAsset> => {
        const response = await apiClient.post<VehicleAsset>('/vehicles/assets', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    updateVehicle: async (id: string, data: FormData): Promise<VehicleAsset> => {
        const response = await apiClient.put<VehicleAsset>(`/vehicles/assets/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteAsset: async (id: string): Promise<void> => {
        await apiClient.delete(`/vehicles/assets/${id}`);
    },
};
