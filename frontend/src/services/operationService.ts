import { apiClient } from '@/lib/api';
import type { DroneAsset, PaginatedResponse, AssetStatus } from '@/types';

export interface CreateDroneData {
    name: string;
    model: string;
    serial_number: string;
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

    getDrone: async (id: string): Promise<DroneAsset> => {
        const response = await apiClient.get<DroneAsset>(`/operations/drones/${id}`);
        return response.data;
    },

    createDrone: async (data: CreateDroneData): Promise<DroneAsset> => {
        const response = await apiClient.post<DroneAsset>('/operations/drones', data);
        return response.data;
    },

    updateDrone: async (id: string, data: UpdateDroneData): Promise<DroneAsset> => {
        const response = await apiClient.put<DroneAsset>(`/operations/drones/${id}`, data);
        return response.data;
    },

    deleteDrone: async (id: string): Promise<void> => {
        await apiClient.delete(`/operations/drones/${id}`);
    },
};
