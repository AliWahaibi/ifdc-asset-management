import { apiClient } from '@/lib/api';

export interface SystemLog {
    id: number;
    timestamp: string;
    level: string;
    user_id?: string;
    user?: {
        full_name: string;
        email: string;
    };
    action: string;
    details: string;
}

interface LogsResponse {
    data: SystemLog[];
    total: number;
    page: number;
    limit: number;
}

export const logService = {
    getLogs: async (page = 1, limit = 50): Promise<LogsResponse> => {
        const response = await apiClient.get<LogsResponse>(`/logs?page=${page}&limit=${limit}`);
        return response.data;
    }
};
