import { apiClient } from '@/lib/api';

export interface AssetAvailability {
    id: string;
    name: string;
    type: string;
    is_reserved: boolean;
    reserved_by_user_name?: string;
    reserved_start?: string;
    reserved_end?: string;
    project_name?: string;
}

export interface RequestedAsset {
    asset_id: string;
    asset_type: string;
}

export interface CreateAdmissionData {
    project_name: string;
    start_date: string;
    end_date: string;
    requested_assets: RequestedAsset[];
}

export const admissionService = {
    checkAvailability: async (startDate: string, endDate: string): Promise<AssetAvailability[]> => {
        const response = await apiClient.get<AssetAvailability[]>('/assets/availability', {
            params: { start_date: startDate, end_date: endDate }
        });
        return response.data;
    },

    createAdmission: async (data: CreateAdmissionData): Promise<any> => {
        const response = await apiClient.post('/admissions', data);
        return response.data;
    },

    getAdmissions: async (): Promise<any[]> => {
        const response = await apiClient.get('/admissions');
        return response.data;
    },

    updateAdmissionStatus: async (id: string, status: 'approved' | 'rejected'): Promise<any> => {
        const response = await apiClient.patch(`/admissions/${id}/status`, { status });
        return response.data;
    }
};
