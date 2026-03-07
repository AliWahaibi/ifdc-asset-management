import { apiClient } from '@/lib/api';

export interface Activity {
    type: string;
    title: string;
    created_at: string;
}

export const dashboardService = {
    getActivities: async (): Promise<Activity[]> => {
        const response = await apiClient.get<Activity[]>('/dashboard/activities');
        return response.data;
    },
};
