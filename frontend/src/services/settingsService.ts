import { apiClient } from '@/lib/api';

export interface SystemSetting {
    id: number;
    company_name: string;
    support_email: string;
    maintenance_threshold_hours: number;
    default_currency: string;
}

export interface BlackoutDate {
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
    created_at: string;
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

    getBlackoutDates: async (): Promise<BlackoutDate[]> => {
        const response = await apiClient.get<BlackoutDate[]>('/settings/blackout-dates');
        return response.data;
    },

    createBlackoutDate: async (data: { start_date: string; end_date: string; reason: string }): Promise<BlackoutDate> => {
        const response = await apiClient.post<BlackoutDate>('/settings/blackout-dates', data);
        return response.data;
    },

    deleteBlackoutDate: async (id: string): Promise<void> => {
        await apiClient.delete(`/settings/blackout-dates/${id}`);
    }
};
