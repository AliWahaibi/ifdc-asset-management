import { apiClient } from '@/lib/api';

export interface SystemSetting {
    id: number;
    company_name: string;
    support_email: string;
    maintenance_threshold_hours: number;
    default_currency: string;
}

export const settingsService = {
    getSettings: async (): Promise<SystemSetting> => {
        const response = await apiClient.get<SystemSetting>('/settings');
        return response.data;
    },

    updateSettings: async (data: Partial<SystemSetting>): Promise<SystemSetting> => {
        const response = await apiClient.put<SystemSetting>('/settings', data);
        return response.data;
    },
};
