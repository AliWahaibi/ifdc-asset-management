import { apiClient } from '@/lib/api';
import type { DroneAsset, PaginatedResponse, AssetStatus } from '@/types';

export interface CreateDroneData {
    name: string;
    model: string;
    serial_number: string;
    reference_number?: string;
    status: AssetStatus;
    department_id: string | null;
    total_flight_hours: number;
    notes: string;
}

export type UpdateDroneData = Partial<CreateDroneData>;

export const operationService = {
    getDrones: async (page = 1, limit = 10, search?: string): Promise<PaginatedResponse<DroneAsset>> => {
        const response = await apiClient.get<PaginatedResponse<DroneAsset>>('/operations/drones', {
            params: { page, limit, search }
        });
        return response.data;
    },

    getAssetsUnified: async (search?: string): Promise<{ data: any[], total: number }> => {
        const response = await apiClient.get<{ data: any[], total: number }>('/operations/assets', {
            params: { search }
        });
        return response.data;
    },

    getDrone: async (id: string): Promise<DroneAsset> => {
        const response = await apiClient.get<DroneAsset>(`/operations/drones/${id}`);
        return response.data;
    },

    createDrone: async (data: FormData): Promise<DroneAsset> => {
        const response = await apiClient.post<DroneAsset>('/operations/drones', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    updateDrone: async (id: string, data: FormData): Promise<DroneAsset> => {
        const response = await apiClient.put<DroneAsset>(`/operations/drones/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteDrone: async (id: string): Promise<void> => {
        await apiClient.delete(`/operations/drones/${id}`);
    },

    deleteDroneImage: async (id: string): Promise<void> => {
        await apiClient.delete(`/operations/drones/${id}/image`);
    },

    resolveMaintenance: async (id: string, notes: string): Promise<DroneAsset> => {
        const response = await apiClient.post<DroneAsset>(`/operations/drones/${id}/maintenance/resolve`, { notes });
        return response.data;
    },

    assignAssets: async (data: { user_id: string, asset_ids: string[], asset_type: string, notes?: string }): Promise<void> => {
        await apiClient.post('/operations/assignments', data);
    },

    getBatteries: async (): Promise<{ data: any[] }> => {
        const response = await apiClient.get<{ data: any[] }>('/operations/batteries');
        return response.data;
    },

    getAccessories: async (): Promise<{ data: any[] }> => {
        const response = await apiClient.get<{ data: any[] }>('/operations/accessories');
        return response.data;
    },

    createBattery: async (data: { name: string, model: string, serial_number: string, cycle_count: number }): Promise<any> => {
        const response = await apiClient.post('/operations/batteries', data);
        return response.data;
    },

    createAccessory: async (data: { name: string, type: string, serial_number: string }): Promise<any> => {
        const response = await apiClient.post('/operations/accessories', data);
        return response.data;
    },

    getUniqueTypes: async (): Promise<{ drone_models: string[], accessory_types: string[], rnd_asset_types: string[] }> => {
        const response = await apiClient.get('/assets/unique-types');
        return response.data;
    },
};
